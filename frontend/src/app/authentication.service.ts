import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable()
export class AuthenticationService {


    constructor(private http: HttpClient) { }

    Authenticate(formValues): Observable<any> {
        return this.http.post('/authenticate', formValues)
            .pipe();
    }
}