import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GoogleLoginProvider, SocialLoginModule } from 'angularx-social-login';
import { MatButtonModule } from "@angular/material/button";
import { LoginComponent } from './login/login.component';
import { ForecastResultsComponent } from './forecast-results/forecast-results.component';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { HttpClientModule } from "@angular/common/http";
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from "@angular/material/input";
import { ForecastSettingsComponent } from './forecast-settings/forecast-settings.component';
import { CalendarSelectComponent } from './calendar-select/calendar-select.component';
import { GoogleApiModule, NgGapiClientConfig, NG_GAPI_CONFIG } from 'ng-gapi';
import { FormsModule } from '@angular/forms';

let gapiClientConfig: NgGapiClientConfig = {
	client_id: "678466581760-n7gkog91vjgtkenm9q1a729uul2muie3.apps.googleusercontent.com",
	discoveryDocs: [
		"https://www.googleapis.com/discovery/v1/apis/"
	],
	scope: "profile email https://www.googleapis.com/auth/calendar.readonly"
};

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ForecastResultsComponent,
    ForecastSettingsComponent,
    CalendarSelectComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
		FormsModule,
		SocialLoginModule,
		MatButtonModule,
		MatTableModule,
		MatPaginatorModule,
		MatSortModule,
		MatSelectModule,
		MatInputModule,
		HttpClientModule,
		GoogleApiModule.forRoot({
			provide: NG_GAPI_CONFIG,
			useValue: gapiClientConfig
		})
  ],
  // providers: [
	// 	{
	// 		provide: 'SocialAuthServiceConfig',
	// 		useValue: {
	// 			autoLogin: false,
	// 			autoClose: false,
	// 			providers: [
	// 				{
	// 					id: GoogleLoginProvider.PROVIDER_ID,
	// 					provider: new GoogleLoginProvider(
	// 						'678466581760-8uloscosul9j5se4aasqarfbq7gf2j8q.apps.googleusercontent.com',
	// 						{
	// 							scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.readonly'
	// 						}
	// 					)
	// 				},
	// 			]
	// 		}
	// 	},
	// ],
  bootstrap: [AppComponent]
})
export class AppModule { }
