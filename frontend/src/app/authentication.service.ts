import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable()
export class AuthenticationService {

    user_id: string;
    password: string;

    constructor(private http: HttpClient) { }

    Authenticate(formValues): Promise<any> {
        return this.http.post('/authenticate', formValues)
            .toPromise();
    }

    setUserId(user_id: string) {
        this.user_id = user_id;
    }

    getUserId(): string {
        return this.user_id;
    }

    setPassword(password: string) {
        this.password = password;
    }

    getPassword(): string {
        return this.password;
    }
}