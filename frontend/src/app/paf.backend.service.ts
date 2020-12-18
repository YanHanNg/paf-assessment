import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable()
export class PAFBackendService {

    constructor(private http: HttpClient) { }

    shareSomething(formData): Promise<any> {
        return this.http.post('/shareSomthing', formData)
            .toPromise();
    }

}