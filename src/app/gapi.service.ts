import { Injectable, NgZone } from '@angular/core';
import { GoogleApiService, NgGapiClientConfig } from 'ng-gapi';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs';

@Injectable()
export class GapiService {  
  constructor(
    private gapiService: GoogleApiService,
    private zone: NgZone
  ) {
    const run = fn => r => this.zone.run(() => fn(r));
    this.gapiService.onLoad().subscribe(() => {
      gapi.load('client:auth2', run(this.initClient.bind(this)));
    });
  }

  private _signedIn: boolean = false;
  public signedIn$ = new Subject<boolean>();

  public calendars$ = new ReplaySubject<any[]>();
  public events$ = new ReplaySubject();

  public gapiClientConfig: NgGapiClientConfig = {
    client_id: "1064226768811-ucvli8agn4dpq4mo0q19fvbplnanib5d.apps.googleusercontent.com",
    discoveryDocs: ["https://analyticsreporting.googleapis.com/$discovery/rest?version=v4"],
    scope: [
        "https://www.googleapis.com/auth/calendar.readonly"
    ].join(" "),
    cookie_policy: 'single_host_origin',
  };

  public initClient() {
    gapi.client.init(this.gapiClientConfig).then(() => {
      gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus.bind(this));
      this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    })
  }

  public updateSigninStatus(isSignedin: boolean) {
    this.signedIn$.next(isSignedin);
    if(isSignedin) {
      this.loadData();
    }
  }

  public loadData() {
    let client = gapi.client as any;
    client.load('calendar', 'v3', () => {
      client.calendar.calendarList.list().then(response => {
        this.calendars$.next(response.result.items);
      })
    })
  }
  public signIn() {
    gapi.auth2.getAuthInstance().signIn();
  }

  public signOut() {
    gapi.auth2.getAuthInstance().signOut();
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
