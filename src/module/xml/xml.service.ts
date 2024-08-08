import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as path from 'path';

const TAG_TYPE = {
  'SINGLE': 0,
  'OPEN': 1,
  'CLOSE': 2,
}

@Injectable()
class XmlService {
  constructor() { }

  isSingleTag(text: string) {
    return text.match(new RegExp('(\<.*/\>)', 'g'))
  }

  isOpenTag(text: string) {
    return text.match(new RegExp('(\<[^//].*[^/]\>)', 'g'))
  }

  isClosingTag(text: string) {
    return text.match(new RegExp('(\</.*\>)', 'g'))
  }

  type(text: string) {
    if (this.isSingleTag(text)) {
      return TAG_TYPE.SINGLE
    }
    if (this.isOpenTag(text)) {
      return TAG_TYPE.OPEN
    }
    if (this.isClosingTag(text)) {
      return TAG_TYPE.CLOSE
    }
  }

  getAttributesInTag(text: string) {
    let removeSymbol = text.substring(1, text.length - 1);
    const splitTextBySpace = removeSymbol.split(" ");
    let result: any = {};
    for (let i = 1; i < splitTextBySpace.length; i += 1) {
      const positionEqualSymbol = splitTextBySpace[i].indexOf("=");
      result = {
        ...result,
        [`${splitTextBySpace[i].substring(0, positionEqualSymbol)}`]: splitTextBySpace[i].substring(positionEqualSymbol + 2, splitTextBySpace[i].length - 1)
      }
    }

    return result;
  }

  getAttribute(text: string) {
    let removeSymbol = text.substring(1, text.length - 1);
    const splitTextBySpace = removeSymbol.split(" ");
    return splitTextBySpace[0]
  }

  processingXml = (stringXml: string) => {
    let indPosition = 0;
    const stackAttribute = [];
    const stackJson = [];

    const countChildNode: Record<string, number[]> = {};

    let popAttr = null;
    let singleTagBefore = ''

    while (indPosition < stringXml.length) {
      const start = stringXml.indexOf('<', indPosition)
      const end = stringXml.indexOf('>', start);
      const subString = stringXml.substring(start, end + 1);
      const typeTag = this.type(subString);
      let curAtt = this.getAttribute(subString);
      switch (typeTag) {
        case TAG_TYPE.SINGLE: {
          const getInnterTag = this.getAttributesInTag(subString);
          stackJson.push({
            [`${curAtt}`]: {
              innerTag: { ...getInnterTag }
            }
          })

          const isChildArray = curAtt == singleTagBefore;

          if (isChildArray) {
            stackAttribute[stackAttribute.length - 1].isArray = true
          }
          if (stackAttribute.length) {
            const beforeTag = `${stackAttribute[stackAttribute.length - 1].name}`;
            countChildNode[beforeTag][countChildNode[beforeTag].length - 1] += 1
          }
          countChildNode[`${curAtt}`] = countChildNode[`${curAtt}`] ? [...countChildNode[`${curAtt}`], 0] : [0];
          singleTagBefore = curAtt;
          break;
        }
        case TAG_TYPE.OPEN: {
          const getInnterTag = this.getAttributesInTag(subString);
          stackJson.push({
            [`${curAtt}`]: {
              innerTag: { ...getInnterTag }
            }
          })
          const isChildArray = curAtt == popAttr?.name

          if (isChildArray) {
            stackAttribute[stackAttribute.length - 1].isArray = true
          }
          if (stackAttribute.length) {
            const beforeTag = `${stackAttribute[stackAttribute.length - 1].name}`;
            countChildNode[beforeTag][countChildNode[beforeTag].length - 1] += 1
          }
          countChildNode[`${curAtt}`] = countChildNode[`${curAtt}`] ? [...countChildNode[`${curAtt}`], 0] : [0];
          stackAttribute.push({ name: curAtt, typeTag })

          break;
        }
        case TAG_TYPE.CLOSE: { // Close case
          popAttr = stackAttribute.pop();
          const isClosingArray = !!popAttr.isArray

          curAtt = curAtt.substring(1, curAtt.length);
          const childCount = countChildNode[`${curAtt}`][countChildNode[`${curAtt}`].length - 1];
          countChildNode[`${curAtt}`].pop();

          let popObjectJson = isClosingArray
            ? Array(childCount).fill(1).reduce((acc, item) => {
              const obj = stackJson.pop();
              acc.push(obj)
              return acc;
            }, [])
            : Array(childCount).fill(1).reduce((acc, item) => {
              const obj = stackJson.pop();
              return {
                ...acc,
                ...obj
              }
            }, {})

          const popInnerTag = stackJson.pop()
          const getInnerTag = popInnerTag && popInnerTag[`${curAtt}`]?.innerTag ? {
            ...popInnerTag[`${curAtt}`]?.innerTag
          } : {}

          stackJson.push({
            [`${curAtt}`]: isClosingArray
              ? {
                "innerTag": { ...getInnerTag },
                "array": [...popObjectJson]
              }
              : {
                "innerTag": { ...getInnerTag },
                innerValue: stringXml.substring(indPosition, start).trim().replace(/\r\n/g, ''),
                ...popObjectJson,
              }
          })

          break;
        }
        default: {
          break;
        }

      }
      indPosition = end + 1;
    }

    return stackJson;
  }

  queryObject(obj, query) {
    const keys = query.split('.');

    function findValue(currentObj, remainingKeys) {
      if (!currentObj || remainingKeys.length === 0) return undefined;

      const [key, ...restKeys] = remainingKeys;

      if (Array.isArray(currentObj)) {
        for (let item of currentObj) {
          const found = findValue(item, remainingKeys);
          if (found !== undefined) return found;
        }
        return undefined;
      }

      if (key in currentObj) {
        if (restKeys.length === 0) {
          return currentObj[key];
        }
        return findValue(currentObj[key], restKeys);
      }

      for (let subKey in currentObj) {
        if (typeof currentObj[subKey] === 'object') {
          const found = findValue(currentObj[subKey], remainingKeys);
          if (found !== undefined) return found;
        }
      }

      return undefined;
    }

    return findValue(obj, keys);
  }


  async read(bookingCode: string) {
    const absolutePath = path.join('xml_files', `booking_${bookingCode}.xml`);
    const readXml = readFileSync(absolutePath, 'utf8');

    let stringXml = `${readXml.trim()}`.replace(/(\<\?.*\?\>)/g, ''); // Remove head <?*?>

    const result = this.processingXml(stringXml);

    const resv_name_id = (this.queryObject(result, "r:UniqueIDList")?.array || []).find(item =>
      item["c:UniqueID"].innerTag.source == "RESVID"
    )
    const arrival = this.queryObject(result, "r:ArrivalTransport")?.innerTag?.time
    const departure = this.queryObject(result, "r:DepartureTransport")?.innerTag?.time
    const adult = (this.queryObject(result, "hc:GuestCounts")?.array || []).find(item =>
      item["hc:GuestCount"].innerTag.ageQualifyingCode == "ADULT"
    )
    const child = (this.queryObject(result, "hc:GuestCounts")?.array || []).find(item =>
      item["hc:GuestCount"].innerTag.ageQualifyingCode == "CHILD"
    )
    const roomtype = this.queryObject(result, "hc:RoomType")?.innerTag.roomTypeCode
    const ratecode = this.queryObject(result, "hc:RoomRate")?.innerTag.ratePlanCode
    const rateamount = {
      amount: this.queryObject(result, "hc:RoomRate.hc:Base")?.innerValue,
      currency: this.queryObject(result, "hc:RoomRate.hc:Base")?.innerTag.currencyCode
    }
    const guarantee = this.queryObject(result, "hc:Guarantee")?.innerTag.guaranteeType
    const method_payment = this.queryObject(result, "hc:Payment.hc:OtherPayment")?.innerTag.type
    const computed_resv_status = this.queryObject(result, "HotelReservation")?.innerTag.computedReservationStatus
    const last_name = this.queryObject(result, "c:lastName")?.innerValue
    const first_name = this.queryObject(result, "c:firstName")?.innerValue
    const title = this.queryObject(result, "c:nameTitle")?.innerValue || ""
    const booking_balance = this.queryObject(result, "hc:CurrentBalance")?.innerValue
    const booking_created_date = this.queryObject(result, "hc:StartDate")?.innerValue
    const phone_number = this.queryObject(result, "c:PhoneNumber")?.innerValue
    const email = this.queryObject(result, "c:Email")?.innerValue

    const bookingInfo = {
      "confirmation_no": bookingCode,
      "resv_name_id": resv_name_id["c:UniqueID"].innerValue,
      arrival,
      departure,
      adult: adult["hc:GuestCount"].innerTag.count,
      child: child["hc:GuestCount"].innerTag.count,
      roomtype,
      ratecode,
      rateamount,
      guarantee,
      method_payment,
      computed_resv_status,
      last_name,
      first_name,
      title,
      booking_balance,
      booking_created_date,
      phone_number,
      email
    }

    return bookingInfo;
  }

  async readRaw(bookingCode: string) {
    const absolutePath = path.join('xml_files', `booking_${bookingCode}.xml`);
    const readXml = readFileSync(absolutePath, 'utf8');

    let stringXml = `${readXml.trim()}`.replace(/(\<\?.*\?\>)/g, ''); // Remove head <?*?>

    const result = this.processingXml(stringXml);
    return result
  }
}

export default XmlService;
