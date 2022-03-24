import { Logger, PlatformConfig } from 'homebridge';
import fetch from 'node-fetch';

type Clock = {
    id : string;
    name : string;
    product_name : string;
    id_product : string;
    img_url: string;
};

type ClockParameter = {
    value: number;
};

type AuthData = {
    access_token: string;
    expires_in: number;
    refresh_token: string;
};

type DataResponse<T> = {
    ok: boolean;
    data: T;
    message: string;
  };

export class DFApi {
  constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
  ) {
  }

  readonly BASE_URL = 'https://api.daliborfarny.com';
  private readonly API_AUTH = 'client_id=iosnixieclockapp&client_secret=tKFmk3dwMCuWmB9M&';
  private access_token = '';

  async login(): Promise<DataResponse<AuthData>> {
    const body = this.API_AUTH + 'grant_type=password&username='
        + (this.config.username ?? '')
        + '&password=' + (this.config.password ?? '');
    this.log.debug(body);

    const response = await fetch(this.BASE_URL + '/oauth/tokenp', {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse<AuthData>;

    if (result.ok) {
      this.access_token = result.data.access_token;
      return result;
    } else {
      this.log.error(result.message);
      return result;
    }
  }

  async getDevices(): Promise<DataResponse<[Clock]>> {
    const body = this.API_AUTH
        + '&access_token=' + this.access_token;
    const url = this.BASE_URL + '/v1/devices?' + body;
    this.log.debug(url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse<[Clock]>;

    if (result.ok) {
      return result;
    } else {
      this.log.error(result.message);
      return result;
    }
  }

  async getDeviceParameter(deviceId: string, parameter: string): Promise<DataResponse<ClockParameter>> {
    const body = this.API_AUTH
        + '&access_token=' + this.access_token;
    const url = this.BASE_URL + '/v1/devices/' + deviceId.toLowerCase() + '/' + parameter + '?' + body;
    this.log.debug(url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse<ClockParameter>;

    if (result.ok) {
      return result;
    } else {
      return result;
    }
  }

  async setDeviceParameter(deviceId: string, parameter: string, value: number): Promise<DataResponse<ClockParameter>> {
    const url = this.BASE_URL + '/v1/devices/' + deviceId.toLowerCase() + '/' + parameter;
    this.log.debug(url);
    const body = this.API_AUTH
        + '&access_token=' + this.access_token
        + '&arg='+ Math.round(value);
    this.log.debug(body);

    const response = await fetch(url, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse<ClockParameter>;

    if (result.ok) {
      return result;
    } else {
      return result;
    }
  }
}

