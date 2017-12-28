
var fs = require('fs'),path = require('path'),
    xml2js = require('xml2js'),
    vCard = require( 'vcard-json' ),
    pify = require( 'pify' ),
    moment = require('moment')
    ;

let parseVcardFile = pify(vCard.parseVcardFile);
let xmlParser = new xml2js.Parser();
let parseXmlStr = pify(xmlParser.parseString);
let readFile = pify(fs.readFile);
let stat = pify(fs.stat);
let writeFile = pify(fs.writeFile);
let readDir = pify(fs.readdir)
let stdErr = console.error;
let {myPhone, myName }= require('./config');
let files = [];
let contacts = null;

readDir(path.join(__dirname,'VZMessages')).then((items)=>{
  for (var i=0; i<items.length; i++) {
      let item = items[i];
      if(item.indexOf('.vzm') > -1){
        files.push(item);
      }
  }
}).then(()=>{
  parseVcardFile('Contacts.vcf').then((data)=>{
    contacts = data;
    console.log('should be good to go:\n'+ JSON.stringify(data,null,2));
  },stdErr).then(()=>{
    let allActions = files.map((file)=>{
      let fp = path.join(__dirname,'VZMessages',file);
      return readFile(fp, 'utf8').then((fileStr)=>{
        return parseXmlStr(fileStr);
      },stdErr)
      .then((xmlObj)=>{
        let stdObj = xmlJsonToObject(xmlObj);

        let filename = file;
        if(stdObj.length){
          let i = 0
          let numbers = {};
          while(i < stdObj.length ){
            if(stdObj[i].to !== myPhone){
              let contact = lookupContact(stdObj[i].to);
              if(contact && contact.fullname){
                numbers[contact.fullname] = contact.fullname;
              }
              else{
              numbers[stdObj[i].to] = stdObj[i].to;
              }
            }
            i++;
          }
          if(Object.keys(numbers).length){
            filename = Object.keys(numbers).join('-');
          }
          else{
            for(let i =0; i < stdObj.length; i++){
              let contact = lookupContact(stdObj[i].from);
              if(contact && contact.fullname){
                numbers[contact.fullname] = contact.fullname;
              }
              else{
              numbers[stdObj[i].from] = stdObj[i].from;
              }
            }
            if(Object.keys(numbers).length){
              filename = Object.keys(numbers).join('-');
            }
          }
        }
        let writepath = path.join(__dirname,'out',filename+'.html');
        let writeAtempts = 0
        while(true){
        try{
        let st = fs.statSync(writepath);
        writeAtempts++;
        writepath = path.join(__dirname,'out',filename+'-'+writeAtempts+'.html');
        }
        catch(ex){
          return writeFile(writepath,buildMessagePage(stdObj));
        }
      }
      },stdErr);
    });
  });
});

 
 

function xmlJsonToObject(result) {
  let sms = [], mms = [];
  if(result["messages"]["sms"]){
  sms = result["messages"]["sms"].map((m)=>{
    let a = m['$'];
    let o = {'to':m.from_addr[0],
    'from':JSON.parse(m.to_addr[0])[0][0],
    'isSelf': m.from_addr[0].indexOf(myPhone) > -1,
    'time':parseInt(m.time[0]),
    'body':m.body[0],
    'thread_id':m.thread_id[0]}
    let name = lookupContact(o.to);
    if(name){
      o.name = name.fullname;
    } 
    return o;
  });
}
if(result["messages"]["mms"]){
   mms = result["messages"]["mms"].map((m)=>{
     let a = m['$'];
     let pdu = m.pdu[0];
     let parts = m.parts[0].item;

     let matcher = /<!\[CDATA\[(.*?)]]>/g;
    let o = {'to':pdu.from_addr[0],
      'from':JSON.parse(pdu.to_addr[0])[0][0],
      'isSelf': pdu.from_addr[0].indexOf(myPhone) > -1,
      'time':parseInt(pdu.time[0]),
      'body':pdu.body[0],
      'thread_id':pdu.thread_id[0],
      'images':[]
    }
    let name = lookupContact(o.to);
    if(name){
      o.name = name.fullname;
    }
    if(parts){
      for( let i of parts){
        if(i.mimeType[0].indexOf('image') > -1){

          let f = matcher.exec(i._data[0]);
          if(f){
            var bitmap = fs.readFileSync(path.join(__dirname,'VZMessages',f[1]));
            var buf = new Buffer(bitmap);
            var b64str = buf.toString('base64');
            o.images.push('data:'+i.mimeType[0]+';base64,'+b64str);
          }
        }
      }
    }
    return o;
  });
}
  let all = sms.concat(mms).sort(function(a,b){ return a.time - b.time;});
  return all;
}

function lookupContact(phone){
  if(contacts){
    let contact = contacts.find((v)=>{
      if(v['phone']){
        let hasPhone = v.phone.find((p)=>{
          return phone.indexOf(p.value) > -1;
        });
        return hasPhone ? true : false;
      }
    });
    return contact;
  }
  return null;
}

function buildMessagePage(data){
  let bodyhtml = buildMesages(data);
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
    body{
      font-family: Arial, sans-serif;
      font-size: 16px;
    }
.all-msg{
  width:500px;
  margin: 100px auto;
  position: realative;
}
.all-msg img{
  width: 100%;
}
.msg{
  margin-bottom: 20px;
 color: white;
 background-color: #84c147;
 padding: 30px;
 border-radius: 15px;
 
  margin-right: 50px;
}
.msg.self{
  background-color: #ddd;
  text-align: right;
  color: #333;
  margin-right: 0; 
  margin-left: 50px;
}
.msg .date, .msg .to{
  font-size: 12px;
}
.msg .to{
  font-weight: bold;
}
.msg .date{
  font-style: italic;
  margin-bottom: 5px;
  padding-bottom: 5px;
}
.msg.self .date{

}

    </style>
  </head>
  <body>
  <div class="all-msg">
${bodyhtml}
</div>
  </body>
</html>`;
}

function buildMesages(data){
  let outstr = '';
  data.forEach((msg)=>{
    let imgstr = '';
    if(msg['images']){
      for(let img of msg.images){
        imgstr += `<img src="${img}" /><br>`
      }
    }
    nameStr = '';
    if(msg.name){
      nameStr += `<div class="name">${msg.name}</div>`
    }
    if(msg.to === myPhone){
      nameStr += `<div class="name">${myName}</div>`
    }
    let d = new Date();
    d.setTime(msg.time);
    d = moment(d);
    outstr += `<div class="msg ${msg.isSelf ? 'self' : ''}">
<div class="to">${nameStr ? nameStr : msg.to}</div>
<div class="date">${d.format("MMMM Do YYYY, h:mm:ss A")}</div>
<div class="images">${imgstr}</div>
<div class="body">${msg.body}</div>
</div>`;
  });
  return outstr;
}
