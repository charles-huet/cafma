import { Component, OnInit } from '@angular/core';
import { SiteService } from '../site.service';

import { Route } from '../route';

@Component({
  selector: 'app-zone-detail',
  templateUrl: './zone-detail.component.html',
  styleUrls: ['./zone-detail.component.scss'],
  providers: []
})
export class ZoneDetailComponent implements OnInit {

  routes: Route[] = [];

  constructor(public service: SiteService) {
  }

  displayedColumns: string[] = ['position', 'name', 'grade', 'pitch', 'length'];

  ngOnInit(): void {
  }

  getRoutes() {
    const routes = this.service.getActiveZone().routes;
    return routes ? routes : [];
  }

  getImageSource() {
    const imageSource = this.service.getActiveZone().imageURI;
    return imageSource ? ("/assets/" + imageSource) : "";
  }

}
