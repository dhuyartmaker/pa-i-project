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

  getAttributesInTag(text: string) {
    let removeSymbol = text.substring(1, text.length - 1); 
    const splitTextBySpace = removeSymbol.split(" ");
    let result : any = {};
    for (let i = 1; i < splitTextBySpace.length - 1; i += 1) {
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

    const countChildNode : Record<string,number[]> = {};

    let openTagBefore = '';
    while (indPosition < stringXml.length) {
      const start = stringXml.indexOf('<', indPosition)
      const end = stringXml.indexOf('>', start);
      const subString = stringXml.substring(start, end + 1);
      const typeTag = this.type(subString);
      let curAtt = this.getAttribute(subString);

      switch(typeTag) {
        case TAG_TYPE.SINGLE:  {
          const getInnterTag = this.getAttributesInTag(subString);
          stackJson.push({
            [`${curAtt}`]: {
              innerTag: { ...getInnterTag }
            }
          })

          const isChildArray = 
            stackAttribute.length && `${curAtt}` == stackAttribute[stackAttribute.length - 1].name
              
          if (isChildArray) {
            console.log('==stackAttribute[stackAttribute.length - 2]==', stackAttribute[stackAttribute.length - 2])
            stackAttribute[stackAttribute.length - 2].isArray = true
          }
          if (stackAttribute.length) {
            const beforeTag = `${stackAttribute[stackAttribute.length - 1].name}`;
            countChildNode[beforeTag][countChildNode[beforeTag].length - 1] += 1
          }
          countChildNode[`${curAtt}`] = countChildNode[`${curAtt}`] ? [...countChildNode[`${curAtt}`], 0] : [0]; 

          break;
        }
        case TAG_TYPE.OPEN: {
          const getInnterTag = this.getAttributesInTag(subString);
          stackJson.push({
            [`${curAtt}`]: {
              innerTag: { ...getInnterTag }
            }
          })
          const isChildArray = curAtt == openTagBefore
            // stackAttribute.length && `${curAtt}` == stackAttribute[stackAttribute.length - 1].name
              
          if (isChildArray) {
            console.log('==s==', curAtt, stackAttribute[stackAttribute.length - 2])
            stackAttribute[stackAttribute.length - 2].isArray = true
          }
          if (stackAttribute.length) {
            const beforeTag = `${stackAttribute[stackAttribute.length - 1].name}`;
            countChildNode[beforeTag][countChildNode[beforeTag].length - 1] += 1
          }
          countChildNode[`${curAtt}`] = countChildNode[`${curAtt}`] ? [...countChildNode[`${curAtt}`], 0] : [0]; 
          stackAttribute.push({ name: curAtt, typeTag })

          openTagBefore = curAtt;
          break;
        }
        case TAG_TYPE.CLOSE: { // Close case
          const popAttr = stackAttribute.pop();
          const isClosingArray = !!popAttr.isArray

          curAtt = curAtt.substring(1, curAtt.length);
          const childCount = countChildNode[`${curAtt}`][countChildNode[`${curAtt}`].length - 1];
          countChildNode[`${curAtt}`].pop();

          let popObjectJson = isClosingArray
            ? Array(childCount).fill(1).reduce((acc, item) => {
              const obj = stackJson.pop();
              acc.push(obj)
              return acc;
            },[])
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

          stackJson.push({ [`${curAtt}`]: isClosingArray
            ? {
                "innerTag": {...getInnerTag},
                "array": [...popObjectJson ]
              }
            : {
              "innerTag": {...getInnerTag},
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
    const keys = query.split('.'); // Tách các phần của query theo dấu "."
    let current = obj;

    for (let key of keys) {
        current = this.findKeyInObject(current, key);
        if (current === undefined) {
            return undefined;
        }
    }

    return current;
  }

  findKeyInObject(obj, key) {
    if (obj.hasOwnProperty(key)) {
        return obj[key];
    }

    for (let k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            const found = this.findKeyInObject(obj[k], key);
            if (found !== undefined) {
                return found;
            }
        }
    }

    return undefined;
  }


  async read(file: string) {
    const absolutePath = path.join('xml_files', file);
    const readXml = readFileSync(absolutePath, 'utf8');

    let stringXml = `${readXml.trim()}`.replace(/(\<\?.*\?\>)/g, ''); // Remove head <?*?>

    const result = this.processingXml(stringXml);

    console.log(this.queryObject(result, "r:UniqueIDList"))

    return result;
  }
}

export default XmlService;
