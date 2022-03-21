import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { NixieClocksHomebridgePlatform } from './platform';

export class NixieClocksPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: NixieClocksHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Dalibor Farny')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.product_name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));      // SET - bind to the 'setBrightness` method below
  }

  async setOn(value: CharacteristicValue) {
    const parameterValue = (value as boolean) ? 256 : 0;
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessday', parameterValue);
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessnight', parameterValue);
  }

  async getOn(): Promise<CharacteristicValue> {
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'brightnessday');
    if(value.ok) {
      return value.data.value > 0;
    }
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
  }

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
