import { Component, EventEmitter, OnInit, Output, ɵCompiler_compileModuleSync__POST_R3__ } from '@angular/core';
import { GoogleLoginProvider, SocialAuthService, SocialUser } from 'angularx-social-login';
import { GoogleApiService, GoogleAuthService } from 'ng-gapi';

@Component({
  selector: 'fincal-login',
  template: `
      <button 
				type="button"
				[style.background-image]="'url(' + loginPhotoUrl + ')'"
				(click)="loginWithGoogle()" 
				mat-button 
				class="google-login-btn"
			>
				Google
			</button>
  `,
  styles: [`
		.google-login-btn {
			background-repeat: no-repeat;
			background-size: 20%;
			background-position: 10%;
			padding-left: 10%;
		}
	`
  ]
})
export class LoginComponent implements OnInit {

  constructor(
		// private socialAuthService: SocialAuthService
		private _gapiAuth: GoogleAuthService
	) { }

	@Output() userSignedIn = new EventEmitter<gapi.auth2.GoogleUser>();

	loginPhotoUrl: string = '/assets/google-logo.png';

  ngOnInit(): void {
  }

  loginWithGoogle(): void {
		this._gapiAuth.getAuth()
			.subscribe(auth => {
				if (!auth.isSignedIn.get()) {
					auth.signIn().then(res => {			
						this.loginPhotoUrl = res.getBasicProfile().getImageUrl();
						this.userSignedIn.emit(res);
					})
					.catch(e => console.error(e));
				} else {
					let res = auth.currentUser.get();
					this.loginPhotoUrl = res.getBasicProfile().getImageUrl();
					this.userSignedIn.emit(res);
				}
			});
  }
}
