import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';

import {MatPaginator, MatSort} from '@angular/material';
import {DataSource} from '@angular/cdk/collections';

import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/merge';
import 'rxjs/add/observable/of';

import * as fromRoot from '../reducers/index';
import { EntitiesPage } from '../models/entities_page';
import { Entity } from '../models/entity';

import { ConnecApiService } from '../services/connec-api.service';

@Component({
  selector: 'connec-visualiser',
  templateUrl: './visualiser.component.html',
  styleUrls: ['./visualiser.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class VisualiserComponent implements OnInit {
  displayedColumns = ['id', 'code', 'name'];
  dataSource: VisualiserDataSource | null;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private store: Store<fromRoot.State>, private connecApiService: ConnecApiService) {}

  ngOnInit() {
    this.dataSource = new VisualiserDataSource(this.store, this.connecApiService, this.paginator, this.sort);
  }
}

export class VisualiserDataSource extends DataSource<any> {
  pageSize = 100;
  resultsLength = 0;
  isLoadingResults = false;

  constructor(private store: Store<fromRoot.State>,
              private connecApiService: ConnecApiService,
              private paginator: MatPaginator,
              private sort: MatSort) {
    super();
  }

  public connect(): Observable<Entity[]> {
    const displayDataChanges = [
      this.sort.sortChange,
      this.paginator.page
    ];

    // If the user changes the sort order, reset back to the first page.
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    return Observable.merge(...displayDataChanges)
      .startWith(null)
      .switchMap(() => {
        this.isLoadingResults = true;
        return this.connecApiService.fetchEntities('contacts', this.pageSize, this.paginator.pageIndex)
      })
      .map(data => {
        this.isLoadingResults = false;
        this.resultsLength = data.pagination['total'];

        return data.entities;
      })
      .catch(() => {
        this.isLoadingResults = false;
        return Observable.of([]);
      });
  }

  public disconnect() {}
}
