import { Component, OnInit, AfterViewInit, ViewEncapsulation, ViewChild, QueryList, ViewChildren, Inject, forwardRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';

import { MatPaginator, MatSort, MatSelect, MatInput, MatButton, MatCheckbox } from '@angular/material';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { MatAutocomplete } from '@angular/material/autocomplete';

import { Store, ActionReducerMap } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/fromEvent';

import { EntitiesPage } from '../models/entities_page';
import { Entity } from '../models/entity';
import { ProductInstance } from '../models/product_instance';

import { ConnecApiService } from '../services/connec-api.service';
import { MnoeApiService } from '../services/mnoe-api.service';

import { VisualiserComponent } from '../visualiser/visualiser.component';

@Component({
  selector: 'connec-ui',
  templateUrl: './connec-ui.component.html',
  styleUrls: ['./connec-ui.component.css'],
  providers: [ConnecApiService],
  encapsulation: ViewEncapsulation.None
})
export class ConnecUiComponent implements OnInit {
  loading = false;
  currentUser$: Observable<any>;
  organizations = [];

  collections$: Observable<any[]>;
  collections: string[] = [];
  filteredcollections: string[] = [];
  collectionCtrl: FormControl;

  productInstances$: Observable<ProductInstance[]>;
  productInstances = [];

  filterableAttributes = ['code', 'name', 'created_at'];
  attributeValue = undefined;

  selectedApplications = {};

  @ViewChild('loader') loader: MatProgressSpinner;
  @ViewChild('collectionInput') collectionInput: MatInput;
  @ViewChild('auto') autoComplete: MatAutocomplete;

  @ViewChild('organizationSelector') organizationSelector: MatSelect;
  @ViewChild('attributeInput') attributeInput: MatInput;
  @ViewChild('checkboxArchived') checkboxArchived: MatCheckbox;
  @ViewChild('filterButton') filterButton: MatButton;

  @ViewChildren(MatCheckbox) checkboxApplication: QueryList<MatCheckbox>;

  filterButtonClick$: Observable<any>;

  constructor(
    private router: Router,
    public route: ActivatedRoute,
    private connecApiService: ConnecApiService,
    private mnoeApiService: MnoeApiService,
  ) {
    this.collectionCtrl = new FormControl();
  }

  ngOnInit() {
    this.filterButtonClick$ = Observable.fromEvent(this.filterButton._elementRef.nativeElement, 'click');

    // Fetch current user
    this.currentUser$ = this.mnoeApiService.currentUser();

    // Reload applications on Organization change
    this.organizationSelector.change.subscribe((organization: any) => {
      sessionStorage.setItem('channelId', organization.value['uid']);
      sessionStorage.setItem('organizationId', organization.value['id']);

      // Reload product instances
      this.productInstances$ = this.mnoeApiService.productInstances();
    });

    this.currentUser$.subscribe((user: any) => {
      user['organizations'].map(organization => this.organizations.push(organization));
      // Store sso session token
      sessionStorage.setItem('ssoSession', user['sso_session']);

      // Select first Organization
      if(sessionStorage.getItem('organizationId')) {
        this.organizationSelector.value = this.organizations.find(organization => organization['id'] === sessionStorage.getItem('organizationId'));
      } else {
        this.organizationSelector.value = this.organizations[0];
      }

      // Store Organization details in session
      sessionStorage.setItem('channelId', this.organizations[0]['uid']);
      sessionStorage.setItem('organizationId', this.organizations[0]['id']);

      // Available collections
      this.collections$ = this.connecApiService.collections();
      this.collections$.subscribe((res: any) => {
        res.forEach((collection: any) => {
          this.collections.push(collection);
          this.filteredcollections.push(collection);
        })
      });

      // Load product instances
      this.productInstances$ = this.mnoeApiService.productInstances();
      this.productInstances$.subscribe((res: any) => {
        res.forEach((record: any) => {
          this.productInstances.push(record);
          this.selectedApplications[record['uid']] = true;
        })
      });
    });

    // Filter autocomplete list
    this.collectionCtrl.valueChanges
    .subscribe(collection => {
      this.filteredcollections = collection ? this.filterCollections(collection) : this.collections.slice();
    });

    this.autoComplete.optionSelected.subscribe(collection => { this.navigateToCollection(collection.option.value) });
  }

  // Return IdMaps where record has been pushed to external application
  idMapFilter(ids: any): any {
    if(!ids) { return null; }
    return ids.filter(idMap => idMap['id'] && idMap['provider']);
  }

  // Find ProductInstance of an IdMap
  productInstanceFilter(idMap: any): ProductInstance {
    return this.productInstances.find(x => x.uid === idMap['group_id']);
  }

  navigateToCollection(collection: string) {
    this.router.navigate(['/visualiser', collection]);
  }

  filterCollections(name: string) {
    return this.collections.filter(collection =>
      collection.toLowerCase().indexOf(name.toLowerCase()) === 0);
  }
}
