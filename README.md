
# PA-I Project

This is my NestJs Project!
I completed all requirements (include XML updated requirement)

## Table of Contents

- [Install](#install)
- [Usage](#usage)
	- [API](#api)
- [XML](#xml-algorithm)
- [License](#license)

## Install
Require
- NodeJs V18
- PostgresSQL

Need to fill **.env**  same as **.end_sample**.
Please use host name:  ***localhost*** for testing app.

This project uses [node](http://nodejs.org) and [npm](https://npmjs.com). Go check them out if you don't have them locally installed.

Inside project directory:
```sh
$ npm install
```

## Usage

Run in develop mode
```sh
$ npm run start:dev
```

### API
This app can used to test in Postman and BrowserWeb
Document: https://documenter.getpostman.com/view/13827204/2sA3s1oXRZ#3d359f95-b50f-4ee9-a2b1-806937a74ce8
#### Swagger
http://localhost:3000/api
#### Auth
This module use Postment to testing
- [**POST**] Login: http://localhost:3000/auth/login
	*Login success will set accessToken, refreshToken into httpOnly-Cookie*
- [**GET**] User Info: http://localhost:3000/auth/info
	*Get UserInfo , this API use AuthGuard to Authenticate*
- [**POST**] Register: http://localhost:3000/auth/register
	*After register, must login to authenticate*
- [**GET**] Refresh-token: http://localhost:3000/auth/refresh-token
	*Recreate accessToken. If fail, please login again to authenticate*
- [**GET**] Google Login : http://localhost:3000/api/login-google

#### XML
- [**GET**] Booking Information: http://localhost:3000/booking/:confirmCode
	*Get Booking info from XML file, logic read XML which i will explain below*

#### Payment
Please use browser to testing
-  [**GET**] Payment: http://localhost:3000/payment/:confirmCode
			*Ensure you are authenticated! If created order successfully, copy **checkout_url** from response and access it. 
			Following VCB guide to pay order (Can use ATM Card with EXB Bank).
			After payment, VCB Payment Web will redirect you to my result page!*

## XML-Algorithm
- *Apologize for result of XML can be not match with test case, because i don't understand business of Booking XML and don't have sample XML match result of this XML.
Use http://localhost:3000/booking/218177/raw , to see result when parse entire XML to JSON*
- I will explain result before i discuss about algorithm
In result you will see data with format: 
```
"attribute": {
	"innerTag": { ...object },
	"innerValue": value,
	"array": [ ... object ]
}
```
- With ***attribute*** is name of tag 
- ***innerTag*** is save data in one tag. Example: 
```
<name_tag inner1="val" inner2="val2" />
=>
{
	name_tag: {
		innerTag { "inner1": val, "inner2": 2 }
	}
}
```
- ***innerValue*** to save raw value (text) between open and close tag, if between them, don't have any tags.
```
<name_tag>val</name_tag>
=>
{ name_tag: { innerValue: val }}
```
- ***array*** will save if this tag have many same name child tag
### Idea
- Using Iterator to loop entire file and use Stack Struct to save each \<tag\>. 
- So BigO is **O(n)** with n is length of file.
- Have 3 tag type: Open \<open\> , Single \<single \/\> and Closing \<\close>. 
- Similar ideal of _Polish notation_ , i use stack to save Open Tag until i meet Close Tag, pop it outside and assign to object.
- I have 2 Stack, one to save tag **st_tag**, one to save object result **st_res**. A object **count** to count child node of each tag.
### Step:
- **1) Loop file and find the next tag**
	- If is Open Tag, get innerTag value, push tag it into **st_tag** and innerTag to **st_res**
	- If is Close Tag, i pop the number of child node as **count** out side  and assign to parent object, push it to **st_res** 
	- If is Single Tag, get innerTag value, and push innerTag to **st_res**
		- But my big problems is recognize child tag is element of array. So i use variable **tagOpenBefore** to remember previously opened tag if current tag is same as **tagOpenBefore**, i mark parent object is Array. Thank to that, i know should to push or assign attributes to parent object.
		- My algorithm deal with case that parent tag has name same as name of child tag thank to object **count** does not have format {"tag_name": 5} , it has format { "tag_name": [2,4,5] } , if i meet same name tag, i will push the number of child node and use it to count until i meet close tag, pop it and use the number of child node remain in array.
- **2) Until end of file**
	- Loop until end of file and i get result.
	- Use query nested follow format "a.b", this will find attribute **b** which have ancesto attribute is **a**.
	- Hard pick query assign to result. Example : ***query("r:UniqueIDList")*** is confirmation_code

## License

[MIT](LICENSE) © HUY