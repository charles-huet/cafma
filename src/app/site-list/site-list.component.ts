import { Component, OnInit } from '@angular/core';
import { SiteService } from '../site.service';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';

import { Site } from '../site';
import { Zone } from '../zone'
import { ActivatedRoute, Router } from '@angular/router';

interface SiteFlatNode {
  expandable: boolean;
  name: String;
  level: number;
}

@Component({
  selector: 'app-site-list',
  templateUrl: './site-list.component.html',
  styleUrls: ['./site-list.component.scss'],
  providers: []
})
export class SiteListComponent implements OnInit {

  flatZoneMap = new Map<SiteFlatNode, Zone>();

  private _transformer = (node: Site | Zone, level: number) => {
    const site = <Site>node;
    const zone = <Zone>node;
    const flatZone = {
      expandable: site && !!site.zones && site.zones.length > 0,
      name: node.name,
      level: level
    };
    if (zone) {
      this.flatZoneMap.set(flatZone, <Zone>node);
    }
    return flatZone;
  };

  treeControl = new FlatTreeControl<SiteFlatNode>(
    node => node.level,
    node => node.expandable,
  );

  treeFlattener = new MatTreeFlattener(
    this._transformer,
    node => node.level,
    node => node.expandable,
    node => (<Site>node ? (<Site>node).zones : <Zone[]>[]),
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(private route: ActivatedRoute, private router: Router, public service: SiteService) {
    this.dataSource.data = service.getSites()
  }

  hasChild = (_: number, node: SiteFlatNode) => node.expandable;

  ngOnInit(): void {
    const site = this.route.snapshot.paramMap.get('site');

    if(site) {
      for(const node of this.treeControl.dataNodes) {
        if(this.service.canonical(node.name) === this.service.canonical(site)) {
          this.treeControl.expand(node);
        }
      }
    }
    
    const zone = this.route.snapshot.paramMap.get('zone');
    if (site && zone) {
      this.service.setZoneFromNames(site, zone);
    }
  }

  setZone(node: SiteFlatNode) {
    let site = undefined;

    // apparently this is the only way to get the node's parent
    // which we need to have a nice-looking route
    const { treeControl } = this;
    const currentLevel = treeControl.getLevel(node);

    if (currentLevel >= 1) {
      const index = treeControl.dataNodes.indexOf(node) - 1;

      for (let i = index; i >= 0; i--) {
        const currentNode = treeControl.dataNodes[i];
        
        if (treeControl.getLevel(currentNode) < currentLevel) {
          site = currentNode;
          break;
        }
      }
    }

    if (site) {
      this.service.setZoneFromNames(site.name, node.name);
      this.router.navigate([this.service.canonical(site.name), this.service.canonical(node.name)]);
    }
  }
}
