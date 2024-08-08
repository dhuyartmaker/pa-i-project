import { BadRequestException, Body, Controller, Get, HttpException, Inject, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, ValidationPipe, Render  } from "@nestjs/common";
import XmlService from "./xml.service";
import { AuthGuardCustom } from "../auth/auth.guard";
import * as crypto from "crypto";
import axios from "axios";
import { Response } from "express";
import * as path from "path";
import { ConfigService } from "@nestjs/config";

function jsonToFormData(jsonObject) {
  const formData = new FormData();

  for (const key in jsonObject) {
      if (jsonObject.hasOwnProperty(key)) {
          formData.append(key, jsonObject[key]);
      }
  }

  return formData;
}

@Controller('')
export class XmlController {
  constructor(
    private readonly xmlService: XmlService,
    private readonly configService: ConfigService,
  ) {}

  @Get('booking/:confirmCode')
  @UseGuards(AuthGuardCustom)
  async getXml(@Param() param: any) {
    return this.xmlService.read(param['confirmCode'])
  }

  @Get('booking/:confirmCode/raw')
  async getXmlRaw(@Param() param: any) {
    return this.xmlService.readRaw(param['confirmCode'])
  }

  @Get('payment/:confirmCode')
  async createOrder(@Param() param: any) {
    const xmlObject = await this.xmlService.read(param['confirmCode']);
    if (!xmlObject) return false;

    const payload : any = {
      "function": "CreateOrder",
      "merchant_site_code": 7,
      "order_code": xmlObject.confirmation_no,
      "order_description": "",
      "amount": parseFloat(xmlObject.rateamount.amount) < 2000 ? 2500 : parseFloat(xmlObject.rateamount.amount),
      "currency": "VND",
      "buyer_fullname": `${xmlObject.first_name} ${xmlObject.last_name}`,
      "buyer_email": xmlObject.email || "duchuy2411itd@gmail.com",
      "buyer_mobile": xmlObject.phone_number || "0398911205",
      "buyer_address": "Ben Tre",
      "return_url": `http://localhost:${this.configService.get("PORT") || 3000}/payment-success`,
      "cancel_url": `http://localhost:${this.configService.get("PORT") || 3000}/payment-cancel`,
      "notify_url": "",
      "language": "vi",
    }

    payload.checksum = crypto.createHash('md5').update([
      payload.merchant_site_code,
      payload.order_code,
      payload.order_description,
      payload.amount,
      payload.currency,
      payload.buyer_fullname,
      payload.buyer_email,
      payload.buyer_mobile,
      payload.buyer_address,
      payload.return_url,
      payload.cancel_url,
      payload.notify_url,
      payload.language,
      "123456789"
    ].join("|")).digest('hex');

    const formData = jsonToFormData(payload);

    const result = await axios.post(this.configService.get('VCB_URL'), formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })

    return result?.data
  }


  @Get('payment-success')
  @Render('success')
  async paymentSuccess(@Res() res: Response) {
    return { message: "Payment success!" }
  }

  @Get('payment-fail')
  @Render('fail')
  async paymentFail(@Res() res: Response) {
    return { message: "Payment fail!" }
  }
}
