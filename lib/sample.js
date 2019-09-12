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
	var factory = getFactory();
	var registry_user = await getParticipantRegistry(namespace + ".User");
	var user = factory.newResource(namespace, "User", uuidv4());
	user.firstName = tx.firstName;
	user.lastName = tx.lastName;
	user.email = tx.email;
	user.balance = 5;
	await registry_user.add(user);
}

/**
 * Function to create a new parkspace.
 * @param {org.example.basic.create_parkspace} tx The transaction instance.
 * @transaction
 */
async function create_parkspace(tx) {
	var factory = getFactory();

	var registry_user = await getParticipantRegistry(namespace + ".User");
	var registry_parkspace = await getParticipantRegistry(namespace + ".ParkSpace");
	var registry_parkspace_status = await getParticipantRegistry(namespace + ".ParkSpaceStatus");

	var parkspace_status = factory.newResource(namespace, "ParkSpaceStatus", uuidv4());
	parkspace_status.free_from = tx.free_from;
	parkspace_status.free_to = tx.free_to;
	parkspace.disabled = tx.disabled;
	await registry_parkspace_status.add(parkspace_status);

	var parkspace = factory.newResource(namespace, "ParkSpace", uuidv4());
	parkspace.owner = tx.user;
	parkspace.status = parkspace_status;
	parkspace.coordinates = tx.coordinates;
	parkspace.adress = tx.adress;
	parkspace.price = tx.price;
	await registry_parkspace.add(parkspace);

	tx.user.balance = tx.user.balance + 10;
	await registry_user.update(registry_user);
}

/**
 * Function to create a new car.
 * @param {org.example.basic.create_user} tx The transaction instance.
 * @transaction
 */
async function create_car(tx) {
	var factory = getFactory();
	var registry_car = await getParticipantRegistry(namespace + ".Car");
	var car = factory.newResource(namespace, "Car", uuidv4());
	car.owner = tx.user;
	car.name = tx.name;
	car.model = tx.model;
	car.features = tx.features;
	await registry_car.add(car);
}

/**
 * Sample transaction processor function.
 * @param {org.example.basic.top_up_balance} tx The transaction instance.
 * @transaction
 */
async function top_up_balance(tx) {
	var registry_user = await getParticipantRegistry(namespace + ".User");
	try {
		await registry_user.exists(tx.user);
		tx.user.balance = tx.user.balance + tx.balance;
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
		await registry_parkspace.exists(tx.parkspace);
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
		var factory = getFactory();

		var currentDate = new Date();
		var timeDiff = currentDate.getTime() - tx.parkspace.entry.getTime();
		timeDiff = Math.round(timeDiff / 1000 / 60 / 60);
		var parking_price = timeDiff * tx.parkspace.price;

		var parkEvent = factory.newEvent(namespace, "ParkEvent");
		parkEvent.car = tx.car;
		parkEvent.parkspace = tx.parkspace;
		parkEvent.price = parking_price;
		emit(parkEvent);

		var registry_bill = await getAssetRegistry(namespace + ".Bill");
		var bill = factory.newResource(namespace, "Bill", uuidv4());
		bill.owner = tx.car.owner;
		bill.parking = tx.parkspace;
		bill.price = parking_price;

		var balance_after_transaction = tx.car.owner.balance - parking_price;

		if (balance_after_transaction >= 0) {
			var registry_user = await getParticipantRegistry(namespace + ".User");
			tx.car.owner.balance = balance_after_transaction;
			await registry_user.update(tx.car.owner);

			tx.parkspace.owner.balance = tx.parkspace.owner.balance + parking_price;
			await registry_user.update(tx.parkspace.owner);

			bill.status = "PAYED";
		} else {
			bill.status = "OPEN";

			var unableToPayEvent = factory.newEvent(namespace, "UnableToPayEvent");
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

function uuidv4() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function WrongArgumentException(message) {
	this.message = message;
	this.name = "WrongArgumentException";
}

function InvalidParkingException(message) {
	this.message = message;
	this.name = "InvalidParkingException";
}
