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
  constructor() {}

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

  getAttributesInTag(text: string, nested: any) {
    let removeSymbol = text.substring(1, text.length - 1); 
    const splitTextBySpace = removeSymbol.split(" ");
    let result : any = {};
    result[`${splitTextBySpace[0]}`] = {};
    for (let i = 1; i < splitTextBySpace.length - 1; i += 1) {
      const positionEqualSymbol = splitTextBySpace[i].indexOf("=");
      result[`${splitTextBySpace[0]}`] = {
        ...result[`${splitTextBySpace[0]}`],
        [`${splitTextBySpace[i].substring(0, positionEqualSymbol)}`]: splitTextBySpace[i].substring(positionEqualSymbol + 2, splitTextBySpace[i].length - 1)
      }
    }

    result[`${splitTextBySpace[0]}`] = { ...result[`${splitTextBySpace[0]}`], ...nested }
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
    let stackArray = [];
    let isArray = {};
    const countChildNode = {};

    let result = {};
    let attBefore = '';
    let tagBefore = null;

    while (indPosition < stringXml.length) {
      const start = stringXml.indexOf('<', indPosition)
      const end = stringXml.indexOf('>', start);
      const subString = stringXml.substring(start, end + 1);
      const typeTag = this.type(subString);
      let curAtt = this.getAttribute(subString);

      switch(typeTag) {
        case TAG_TYPE.SINGLE:  {
          break;
        }
        case TAG_TYPE.OPEN: {
          const isArrays = curAtt == attBefore;

          if (isArrays) {
            isArray[`${curAtt}`] = true
            stackArray.push(stackJson.pop())
          }

          console.log('==stackArray==', stackArray, curAtt, attBefore)
          if (stackAttribute.length) {
            countChildNode[`${stackAttribute[stackAttribute.length - 1].name}`] += 1
          }
          countChildNode[`${curAtt}`] = 0; 
          stackAttribute.push({ name: curAtt, typeTag })

          break;
        }
        case TAG_TYPE.CLOSE: { // Close case
          curAtt = curAtt.substring(1, curAtt.length)
          const childCount = countChildNode[`${curAtt}`];

          const isClosingArray = !!(isArray[`${curAtt}`] && tagBefore === TAG_TYPE.CLOSE);
          console.log('==isClosingArray==', isClosingArray, curAtt, childCount)
          let popObjectJson = isClosingArray ? [
            ...stackArray.slice(stackArray.length - childCount + 1, stackArray.length),
            { [`${curAtt}`]: stackJson.pop() }
          ] : Array(childCount).fill(1).reduce((acc, item) => {
            const obj = stackJson.pop();
            return {
              ...acc,
              ...obj
            }
          }, {})

          if (isClosingArray) {
            stackArray = stackArray.slice(0, stackArray.length - childCount + 1)
            isArray[`${curAtt}`] = false;
          }
          console.log('==stackArray=close==', stackArray)
          console.log('==popObjectJson==', popObjectJson)
          stackAttribute.pop()  

          stackJson.push({ [`${curAtt}`]: isClosingArray ? popObjectJson : {
            innerValue: stringXml.substring(indPosition, start).trim().replace(/\r\n/g, ''),
            ...popObjectJson,
          }})
          console.log('==stackJson==', stackJson)

          break;
        }
        default: {
          break;
        }

      }
      indPosition = end + 1;
      attBefore = curAtt;
      tagBefore = typeTag;

    }

    return stackJson;
  }

  async read(file: string) {
    const absolutePath = path.join('xml_files', file);
    const readXml = readFileSync(absolutePath, 'utf8');

    let stringXml = `${readXml.trim()}`.replace(/(\<\?.*\?\>)/g, ''); // Remove head <?*?>

    return this.processingXml(stringXml);
  }
}

export default XmlService;
