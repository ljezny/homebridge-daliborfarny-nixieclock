import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { ExampleHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Dalibor Farny')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.product_name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));      // SET - bind to the 'setBrightness` method below
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    this.platform.log.debug('Set Characteristic On ->', value);
    const parameterValue = (value as boolean) ? 256 : 0;
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessday', parameterValue);
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessnight', parameterValue);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on

    this.platform.log.debug('Get Characteristic On');
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'brightnessday');
    if(value.ok) {
      return value.data.value > 0;
    }
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
    const parameterValue = ((value as number)* 256) / 100;
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessday', parameterValue);
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessnight', parameterValue);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    this.platform.log.debug('Get Characteristic Brightness');
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'brightnessday');
    if(value.ok) {
      return (value.data.value * 100) / 256;
    }
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

}
