import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  errorMessage = ''
  
  form: FormGroup;

  constructor(private fb: FormBuilder, private authSvc: AuthenticationService,
    private router: Router) { }

	ngOnInit(): void { 
    this.form = this.fb.group({
      user_id: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required])
    })
  }

  Authenticate() {
    
    this.authSvc.Authenticate(this.form.value)
      .then(data => {
        if(data.msg == 'Authenticated')
        {
          this.authSvc.setUserId(this.form.get('user_id').value);
          this.authSvc.setPassword(this.form.get('password').value)
          this.router.navigate(['/main']);
        }
      })
      .catch(err => {
        this.authSvc.setUserId('');
        this.authSvc.setPassword('');
        console.error('Error Occured During Authentication: ', err);
        this.errorMessage = err.error.msg;
      })
  }

}
