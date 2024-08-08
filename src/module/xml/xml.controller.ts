import { BadRequestException, Body, Controller, Get, HttpException, Inject, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, ValidationPipe } from "@nestjs/common";
import XmlService from "./xml.service";

@Controller('booking')
export class XmlController {
  constructor(
    private readonly xmlService: XmlService
  ) {}

  @Get(':confirmCode')
  async getXml(@Param() param: any) {
    return this.xmlService.read(param['confirmCode'])
  }
}
