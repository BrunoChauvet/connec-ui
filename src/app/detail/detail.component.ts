import { Component, OnInit, ViewEncapsulation, ViewChild, Inject, forwardRef } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { ConnecUiComponent } from '../connec-ui/connec-ui.component';
import { ConnecApiService } from '../services/connec-api.service';

import { Observable } from 'rxjs/Observable';
import { Entity } from '../models/entity';
import { EntitiesPage } from '../models/entities_page';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css'],
  providers: [ConnecApiService],
  encapsulation: ViewEncapsulation.None
})
export class DetailComponent implements OnInit {
  jsonSchema$: Observable<any>;
  jsonSchema: any;
  entity$: Observable<Entity>;
  entity: Entity;

  matchingRecords$: Observable<EntitiesPage>;
  matchingRecords: EntitiesPage;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private connecApiService: ConnecApiService,
    private _location: Location,
    public dialog: MatDialog,
    @Inject(forwardRef(() => ConnecUiComponent)) public _parent:ConnecUiComponent
  ) { }

  ngOnInit() {
    if(this._parent.organizationSelector.value) {
      this.connecApiService.channelId = this._parent.organizationSelector.value['uid'];
      this.loadEntity();
    }

    this._parent.currentUser$.subscribe((res: any) => {
      // Force selected collection using route
      this.route.params.subscribe((params: Params) => {
        this.connecApiService.channelId = this._parent.organizationSelector.value['uid'];
        this._parent.collectionCtrl.setValue(params['collection']);
        this.loadEntity();
      });
    });
  }

  loadEntity() {
    // Fetch entity
    this.entity$ = this.route.params.switchMap((params: Params) => {
      this._parent.loading = true;
      return this.connecApiService.fetchEntity(params['collection'], params['id'])
    });

    // On entity load, fetch matching records
    this.entity$.subscribe(entity => {
      this._parent.loading = false;
      this.entity = entity;

      // Load Json schema
      this.jsonSchema$ = this.connecApiService.jsonSchema(this.entity.resource_type);
      this.jsonSchema$.subscribe(schema => this.jsonSchema = schema.plain());

      // Fetch matching records
      if(this.entity.matching_records) {
        var filter = '_id in ';
        var ids = this.entity.matching_records.map(record => {
          if(!record.match_id) { return ''; }
          return "'" + record.match_id.find(idMap => idMap['provider'] === 'connec')['id'] + "'";
        }).join(',');
        filter += '[' + ids + ']';

        this.matchingRecords$ = this.connecApiService.fetchEntities(this.entity.resource_type, 100, 0, 'created_at', 'ASC', filter);
        this.matchingRecords$.subscribe(matchingRecords => this.matchingRecords = matchingRecords);
      }
    });
  }

  navigateToCollection(collection: string) {
    this._location.back();
  }

  navigateToDetails(entity: Entity) {
    var idMap = entity.id.find(idMap => idMap['provider'] === 'connec');
    this.router.navigate(['/visualiser', entity.resource_type, idMap['id']]);
  }

  createRecord(formData) {
    var keys = Object.keys(formData);
    var collection = keys[0];
    var record = formData[collection][0];
    var data = {};
    data[collection] = record;

    this.connecApiService.createEntity(collection, data)
      .subscribe(record => {
        this.router.navigate(['/visualiser', record.resource_type, record.id]);
        scroll(0,0);
      });
  }
}
