/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit */
const namespace = "org.example.basic";

/**
 * Function to create a new user.
 * @param {org.example.basic.create_user} tx The transaction instance.
 * @transaction
 */
async function create_user(tx) {
	await create_user(uuidv4(), tx.firstName, tx.lastName, tx.email);
}

/**
 * Function to create a new park space.
 * @param {org.example.basic.create_parkspace} tx The transaction instance.
 * @transaction
 */
async function create_parkspace(tx) {
	await create_parkspace(
		uuidv4(),
		tx.user,
		tx.coordinates,
		tx.address,
		tx.price,
		tx.free_from,
		tx.free_to,
		tx.disabled
	);
}

/**
 * Function to create a new car.
 * @param {org.example.basic.create_car} tx The transaction instance.
 * @transaction
 */
async function create_car(tx) {
	await create_car(uuidv4(), tx.user, tx.name, tx.model, tx.features);
}

/**
 * Sample transaction processor function.
 * @param {org.example.basic.top_up_balance} tx The transaction instance.
 * @transaction
 */
async function top_up_balance(tx) {
	var registry_user = await getParticipantRegistry(namespace + ".User");
	try {
		await registry_user.exists(tx.user.userId);
		tx.user.balance = (parseFloat(tx.user.balance) + tx.balance).toString();
		await registry_user.update(tx.user);
	} catch (error) {
		throw new WrongArgumentException("User Account doesn't exist");
	}
}

/**
 * Sample transaction processor function.
 * @param {org.example.basic.parking_in} tx The transaction instance.
 * @transaction
 */
async function parking_in(tx) {
	var registry_parkspace = await getAssetRegistry(namespace + ".ParkSpace");
	try {
		await registry_parkspace.exists(tx.parkspace.parkId);
		tx.parkspace.entry = new Date();
		await registry_parkspace.update(tx.parkspace);
	} catch (error) {
		throw new WrongArgumentException("Park space doesn't exist");
	}
}

/**
 * Sample transaction processor function.
 * @param {org.example.basic.parking_out} tx The transaction instance.
 * @transaction
 */
async function parking_out(tx) {
	if (tx.parkspace.entry != null) {
		var factory = await getFactory();

		var currentDate = new Date();
		var timeDiff = currentDate.getTime() - tx.parkspace.entry.getTime();
		timeDiff = Math.round(timeDiff / 1000);
		var parking_price = timeDiff * tx.parkspace.price;

		var parkEvent = await factory.newEvent(namespace, "ParkEvent");
		parkEvent.car = tx.car;
		parkEvent.parkspace = tx.parkspace;
		parkEvent.price = parking_price;
		emit(parkEvent);

		var registry_bill = await getAssetRegistry(namespace + ".Bill");
		var bill = await factory.newResource(namespace, "Bill", uuidv4());
		bill.owner = tx.car.owner;
		bill.parking = tx.parkspace;
		bill.price = parking_price;

		var balance_after_transaction = parseFloat(tx.car.owner.balance) - parking_price;

		if (balance_after_transaction >= 0) {
			var registry_user = await getParticipantRegistry(namespace + ".User");
			tx.car.owner.balance = balance_after_transaction.toString();
			await registry_user.update(tx.car.owner);

			tx.parkspace.owner.balance = (
				parseFloat(tx.parkspace.owner.balance) + parking_price
			).toString();
			await registry_user.update(tx.parkspace.owner);

			bill.status = "PAYED";
		} else {
			bill.status = "OPEN";

			var unableToPayEvent = await factory.newEvent(namespace, "UnableToPayEvent");
			unableToPayEvent.owner = tx.car.owner;
			unableToPayEvent.bill = bill;
			emit(unableToPayEvent);
		}

		var registry_parkspace = await getAssetRegistry(namespace + ".ParkSpace");
		tx.parkspace.entry = null;
		await registry_parkspace.update(tx.parkspace);

		await registry_bill.add(bill);
	} else {
		throw new InvalidParkingException("cannot park out when not parked in");
	}
}

/**
 * Transaction to create example data.
 * @param {org.example.basic.create_example_data_users} tx The transaction instance.
 * @transaction
 */
async function create_example_data_users(tx) {
	// create Users
	var max = await create_user("1000", "Max", "Mustermann", "max.mustermann@gmail.com");
	var jhon = await create_user("2000", "Jhon", "Doe", "jhon.doe@gmail.com");
	var peter = await create_user("3000", "Peter", "Kneubuehler", "peter.k@gmail.com");
}

/**
 * Transaction to create example data.
 * @param {org.example.basic.create_example_data_cars} tx The transaction instance.
 * @transaction
 */
async function create_example_data_cars(tx) {
	// create Cars
	var car_max = await create_car("805d0302476504", tx.owner_car_1, "family car", "Hyundai", [
		"family car",
		"very long"
	]);
	var car_peter = await create_car("805d0302724004", tx.owner_car_2, "drop top", "Mercedes", [
		"very big"
	]);
}

/**
 * Transaction to create example data.
 * @param {org.example.basic.create_example_data_parkspaces} tx The transaction instance.
 * @transaction
 */
async function create_example_data_parkspaces(tx) {
	// create Parkspace
	var parkspace_jhon = await create_parkspace(
		"80808080806504",
		tx.owner_parkspace,
		"45,45",
		"gugus street",
		0.35,
		"09:00",
		"18:00",
		false
	);
}

async function create_user(id, firstName, lastName, email) {
	var factory = await getFactory();
	var registry_user = await getParticipantRegistry(namespace + ".User");
	var user = await factory.newResource(namespace, "User", id);
	user.firstName = firstName;
	user.lastName = lastName;
	user.email = email;
	user.balance = "5";
	try {
		await registry_user.add(user);
	} catch (error) {
		throw new Error("Unexpected Error when creating a new user: " + error);
	}

	return user;
}

async function create_parkspace(
	id,
	user,
	coordinates,
	address,
	price,
	free_from,
	free_to,
	disabled
) {
	var factory = await getFactory();

	var registry_user = await getParticipantRegistry(namespace + ".User");
	var registry_parkspace = await getAssetRegistry(namespace + ".ParkSpace");
	var registry_parkspace_status = await getAssetRegistry(namespace + ".ParkSpaceStatus");

	var parkspace_status = await factory.newResource(namespace, "ParkSpaceStatus", id);
	parkspace_status.free_from = free_from;
	parkspace_status.free_to = free_to;
	parkspace_status.disabled = disabled;
	try {
		await registry_parkspace_status.add(parkspace_status);
	} catch (error) {
		throw new Error("Unexpected Error when creating a new parkspace: " + error);
	}

	var parkspace = await factory.newResource(namespace, "ParkSpace", id);
	parkspace.owner = user;
	parkspace.status = parkspace_status;
	parkspace.coordinates = coordinates;
	parkspace.address = address;
	parkspace.price = price;
	try {
		await registry_parkspace.add(parkspace);
	} catch (error) {
		throw new Error("Unexpected Error when creating a new parkspace: " + error);
	}

	user.balance = (parseFloat(user.balance) + 10).toString();
	await registry_user.update(user);

	return parkspace;
}

async function create_car(id, user, name, model, features) {
	var factory = await getFactory();
	var registry_car = await getAssetRegistry(namespace + ".Car");
	var car = await factory.newResource(namespace, "Car", id);
	car.owner = user;
	car.name = name;
	car.model = model;
	car.features = features;
	await registry_car.add(car);

	return car;
}

function uuidv4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function WrongArgumentException(message) {
	const error = new Error(message);
	return error;
}

function InvalidParkingException(message) {
	const error = new Error(message);
	return error;
}
