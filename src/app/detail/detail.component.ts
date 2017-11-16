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
    this.connecApiService.channelId = this._parent.organizationSelector.value;
    this.connecApiService.ssoSession = this._parent.ssoSession;

    // Fetch entity
    this.entity$ = this.route.params.switchMap((params: Params) => this.connecApiService.fetchEntity(params['collection'], params['id']));
    this.entity$.subscribe(entity => {
      this.entity = entity;

      // Fetch matching records
      if(this.entity.matching_records) {
        var filter = '_id in ';
        var ids = this.entity.matching_records.map(record => {
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
}
