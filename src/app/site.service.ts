import { Injectable } from '@angular/core';
import { Site } from './site';
import { Zone } from './zone';
import sitesData from './sites.json';

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  sites: Site[] = sitesData;

  getSites() {
    return this.sites;
  }

  zone: Zone = {name:""}
  getActiveZone() {
    console.log(`getting zone: ${this.zone.name}`)
    return this.zone;
  }

  private setActiveZone(zone: Zone) {
    this.zone = zone;
  }

  canonical(value:String) {
    return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s/g, '_').toLowerCase();
  }

  setZoneFromNames(siteName:String, zoneName:String) {
    console.debug(`setting current zone, site (${this.canonical(siteName)}); zone (${this.canonical(zoneName)})`);
    const site = this.sites.find(site => this.canonical(site.name) === this.canonical(siteName));
    if(site && site.zones) {
      const zone = site.zones.find(zone => this.canonical(zone.name) === this.canonical(zoneName));
      if(zone) {
        this.setActiveZone(zone);
        return true;
      }
    }
    return false;
  }
}
