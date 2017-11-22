import { Injectable } from '@angular/core';
import { GoogleApiService, NgGapiClientConfig } from 'ng-gapi';

@Injectable()
export class GapiService {  
  constructor(private gapiService: GoogleApiService) {
    this.gapiService.onLoad().subscribe(() => {
    });
  }

  public gapiClientConfig: NgGapiClientConfig = {
    client_id: "1064226768811-ucvli8agn4dpq4mo0q19fvbplnanib5d.apps.googleusercontent.com",
    discoveryDocs: ["https://analyticsreporting.googleapis.com/$discovery/rest?version=v4"],
    scope: [
        "https://www.googleapis.com/auth/calendar.readonly"
    ].join(" "),
    cookie_policy: 'single_host_origin',
  };
  private _accessToken;

  public authorize(): Promise<any> {
    return new Promise((resolve, error) => {
      gapi.load("auth", () => {
        gapi.auth.authorize(this.gapiClientConfig, authResult => {
          if(authResult) {
            if(!authResult.error) {
              this._accessToken = authResult;
              resolve();
            } else {
              error(authResult.error);
            }
          } else {
            error("Unkown error");
          }
        });
      });
    })
  }

  public signOut() {
    gapi.load("auth", () => {
      gapi.auth.signOut();
    });
  }

  public loadCalendars(): Promise<any> {
    return new Promise((resolve, error) => {
      gapi.load("client", () => {
        let client = gapi.client as any;
        client.load('calendar', 'v3', () => {
          client.calendar.calendarList.list({}).execute(response => {
            resolve(response.result.items)
          })
        });
      })
    });
  }

  public getUpcomingEvents(id, tarDate): Promise<any> {
    return new Promise((resolve, error) => {
      gapi.load("client", () => {
        var minDate = new Date();
        var maxDate  = new Date(tarDate);
        maxDate.setDate(maxDate.getDate() + 1 );
        id = id || 'primary';
        let client = gapi.client as any;
        client.load('events', 'v3', () => {
          let params = {
            'calendarId': id,
            'timeMin': minDate.toISOString(),
            'timeMax': maxDate.toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 1000,
            'orderBy': 'startTime'
          };
          let events = client.calendar.events.list(params);
          events.then(items => {
            resolve(items);
          });
        });
      })
    });
  }
}
