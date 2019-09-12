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
 * Sample transaction processor function.
 * @param {org.example.basic.top_up_balance} tx The transaction instance.
 * @transaction
 */
async function top_up_balance(tx) {
  var registry = await getParticipantRegistry(namespace + ".User");
  var user_exists = await registry.exists(tx.user);
  //console.log(user_exists);
  if (user_exists) {
    tx.user.balance = tx.user.balance + tx.balance;
    await registry.update(tx.user);
  } else {
    //throw "FEHLER";
    throw new WrongArgumentException("User Account doesn't Exist");
  }
}

/**
 * Sample transaction processor function.
 * @param {org.example.basic.parking_in} tx The transaction instance.
 * @transaction
 */
async function parking_in(tx) {
  var parkSpaceIndex = tx.parkspace.parkId;
  var registry = await getAssetRegistry(namespace + ".ParkSpace");
  var parkspace = await registry.get(parkSpaceIndex);
  parkspace.entry = new Date();
  await registry.update(parkspace);
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
    console.log("cannot parkout when not parked in");
  }
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function WrongArgumentException(text) {
  this.message = message;
}
