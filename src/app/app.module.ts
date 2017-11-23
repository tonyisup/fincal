import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { MatButtonModule, MatSelectModule, MatInputModule, MatCardModule, MatTableModule, MatExpansionModule, MatSlideToggleModule, MatToolbarModule, MatIconModule } from '@angular/material'
import { GoogleApiModule, NgGapiClientConfig, NG_GAPI_CONFIG } from 'ng-gapi';
import { GapiService } from './gapi.service';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FlexLayoutModule } from '@angular/flex-layout';

let gapiClientConfig: NgGapiClientConfig = {
  client_id: "1064226768811-ucvli8agn4dpq4mo0q19fvbplnanib5d.apps.googleusercontent.com",
  discoveryDocs: ["https://analyticsreporting.googleapis.com/$discovery/rest?version=v4"],
  scope: [
      "https://www.googleapis.com/auth/calendar.readonly"
  ].join(" "),
  cookie_policy: 'single_host_origin',
};

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
    MatCardModule,
    FlexLayoutModule,
    MatTableModule,
    BrowserAnimationsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatToolbarModule,
    MatIconModule,
    GoogleApiModule.forRoot({
      provide: NG_GAPI_CONFIG,
      useValue: gapiClientConfig
    })
  ],
  providers: [
    GapiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
