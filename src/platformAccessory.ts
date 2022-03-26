import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NixieClocksHomebridgePlatform } from './platform';

export class NixieClocksPlatformAccessory {
  private service: Service;
  private underlightService?: Service;

  constructor(
    private readonly platform: NixieClocksHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Dalibor Farny')
      .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.product_name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb)
      || this.accessory.addService(this.platform.Service.Lightbulb, 'Tubes', 'Tubes');
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.product_name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));

    if(this.supportsUnderLight()) {
      this.underlightService = this.accessory.getService('Underlight')
        || this.accessory.addService(this.platform.Service.Lightbulb, 'Underlight', 'Underlight');

      this.underlightService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setUnderlightOn.bind(this))
        .onGet(this.getUnderlightOn.bind(this));

      this.underlightService.getCharacteristic(this.platform.Characteristic.Hue)
        .onSet(this.setUnderlightHue.bind(this))
        .onGet(this.getUnderlightHue.bind(this));

      this.underlightService.getCharacteristic(this.platform.Characteristic.Saturation)
        .onSet(this.setUnderlightSaturation.bind(this))
        .onGet(this.getUnderlightSaturation.bind(this));
    }
  }

  supportsUnderLight(): boolean {
    return this.accessory.context.device.id_product === '2';
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug('Set On -> ', value);

    if(value as boolean) {
      const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'brightnessday');
      if(value.ok) {
        this.platform.log.debug('Current value -> ', value.data.value);
        if(value.data.value === 1) {
          await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessday', 255);
          await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessnight', 255);
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, 100);
        }
      } else {
        throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
      }
    } else {
      await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessday', 0);
      await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'brightnessnight', 0);
      this.service.updateCharacteristic(this.platform.Characteristic.Brightness, 0);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'brightnessday');
    if(!value.ok) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    return value.data.value > 0;
  }

  async setUnderlightOn(value: CharacteristicValue) {
    if(!(await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'underlightsegments',
      (value as boolean) ? 6 : 1)).ok) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    if(!(await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'underlightmode',
      (value as boolean) ? 2 : 1)).ok){
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getUnderlightOn(): Promise<CharacteristicValue> {
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'underlightmode');
    if(!value.ok) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    return value.data.value === 2;
  }

  async setUnderlightHue(value: CharacteristicValue) {
    this.platform.log.debug('Set Characteristic Hue -> ', value);
    const rgb = this.HSVtoRGB(value as number / 360.0, 1.0, 1.0);
    const color = rgb[0] | (rgb[1] << 8) | (rgb[2] << 16);
    this.platform.log.debug('Set Characteristic Hue -> final color ', color);
    await this.platform.dfApi.setDeviceParameter(this.accessory.context.device.id, 'underlightsolidcolor', color);
  }

  async getUnderlightHue(): Promise<CharacteristicValue> {
    const value = await this.platform.dfApi.getDeviceParameter(this.accessory.context.device.id, 'underlightsolidcolor');
    if(!value.ok) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    return this.RGBtoHSV(value.data.value && 0xFF, (value.data.value >> 8) && 0xFF, (value.data.value >> 16) && 0xFF)[0] * 360 / 255 ;
  }

  async setUnderlightSaturation(value: CharacteristicValue) {
    this.platform.log.debug('Set Characteristic Hue -> ', value);
  }

  async getUnderlightSaturation(): Promise<CharacteristicValue> { //0-100 percent
    return 100;
  }

  async setBrightness(value: CharacteristicValue) {
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

  HSVtoRGB(h: number, s: number, v: number): number[] {
    let r = 0;
    let g = 0;
    let b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  RGBtoHSV(r: number, g: number, b: number): number[] {
    let h = 0;
    let s = 0;
    let v = 0;

    const rgbMin = r < g ? (r < b ? r : b) : (g < b ? g : b);
    const rgbMax = r > g ? (r > b ? r : b) : (g > b ? g : b);

    v = rgbMax;
    if (v === 0) {
      h = 0;
      s = 0;
      return [h, s, v];
    }

    s = 255 * (rgbMax - rgbMin) / v;
    if (s === 0) {
      h = 0;
      return [h, s, v];
    }

    if (rgbMax === r) {
      h = 0 + 43 * (g - b) / (rgbMax - rgbMin);
    } else if (rgbMax === g) {
      h = 85 + 43 * (b - r) / (rgbMax - rgbMin);
    } else {
      h = 171 + 43 * (r - g) / (rgbMax - rgbMin);
    }

    return [h, s, v];
  }
}
