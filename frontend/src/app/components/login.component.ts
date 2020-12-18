import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  errorMessage = ''
  
  form: FormGroup;

	constructor(private fb: FormBuilder) { }

	ngOnInit(): void { 
    this.form = this.fb.group({
      user_id: this.fb.control('', [Validators.required]),
      password: this.fb.control('', [Validators.required])
    })
  }

  Authenticate() {
    console.info(this.form.value);
  }

}
