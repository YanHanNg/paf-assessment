import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import {CameraService} from '../camera.service';
import { PAFBackendService } from '../paf.backend.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

	imagePath = '/assets/cactus.png'

	form: FormGroup;

	constructor(private cameraSvc: CameraService, private fb: FormBuilder, private authSvc: AuthenticationService,
		private pafBackEndSvc: PAFBackendService, private router: Router) { }

	ngOnInit(): void {
		this.form = this.fb.group({
			title: this.fb.control('', [Validators.required]),
			comments: this.fb.control('', [Validators.required]),
			capturedImage: this.fb.control('', [Validators.required])
		})

		if (this.cameraSvc.hasImage()) {
			const img = this.cameraSvc.getImage()
			this.imagePath = img.imageAsDataUrl
			this.form.get('capturedImage').setValue(this.imagePath);
		}
	}

	clear() {
		this.imagePath = '/assets/cactus.png'
		this.form.get('capturedImage').setValue('');
	}

	shareSmth() {
		//Send as Multipart
		let formData = new FormData();

		formData.set('user_id', this.authSvc.getUserId());
		formData.set('password', this.authSvc.getPassword());
		//formData.set('password', 'abc');
		formData.set('title', this.form.get('title').value);
		formData.set('comments', this.form.get('comments').value);
		formData.set('image-file', this.cameraSvc.getImage().imageData);

		this.pafBackEndSvc.shareSomething(formData)
			.then(data => {
				//Success
				this.form.reset();
				this.clear();
			})
			.catch(err => {
				console.info(err);
				//if err 401 naviate to view 1
				if(err.status === 401)
					this.router.navigate(['/']);
			})

	}
}
