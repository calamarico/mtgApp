var fs = require('fs');
var sax = require('./sax.js');
var nano = require('nano')('http://localhost:5984');

var strict = true;
var parser = sax.parser(true, {trim:true}),data_array=[],XML_string='';JSON_string='';

var isCardOpen = false;
var bufferTemp = {};
var actualTag = null;
var actualSetObj = null;

parser.onerror = function (e) {
                // an error happened.
            };
parser.ontext = function (t) {
              // got some text.  t is the string of text.
              //console.log('data_array:' + data_array);
    if(isCardOpen) {
        console.log('texto:' + t);
        if(actualSetObj) {
          actualSetObj.text = t;
        }
        else {
          bufferTemp[actualTag] = t;
        }
    }
};
parser.onopentag = function (node) {

  if(isCardOpen && node.name !== 'card') {
    console.log('abre tag:' + node.name);
    actualTag = node.name;
  }
  if(node.name === 'card') {
    isCardOpen = true;
    console.log('abre tag:' + node.name);
    bufferTemp = {
      name: "",
      set: [],
      color: "",
      manacost: "",
      type: "",
      pt: "",
      tablerow: "",
      text: "",
      cipt: "",
      loyalty: ""
    };
  }
  // opened a tag.  node has "name" and "attributes"

};
parser.onclosetag = function(name) {
  console.log('cierra tag:' + name);
  if(name === 'card') {
    isCardOpen = false;
    data_array.push(bufferTemp);
  }
  else if(name === 'set' && isCardOpen) {
    actualSetObj = null;
  }
}
parser.onattribute = function (attr) {
    if(isCardOpen && attr.name === 'picURL') {
      actualSetObj = {
        text: '',
        picURL: '',
        picURLHq: '',
        picURLSt: ''
      }
      bufferTemp.set.push(actualSetObj);
    }
    if(actualSetObj) {
      switch(attr.name) {
        case 'picURL':
        case 'picURLHq':
        case 'picURLSt':
          actualSetObj[attr.name] = attr.value;
          break;
      }
    }
};
parser.onend = function () {
              // parser stream is done, and ready to have more stuff written to it.
              console.log("XML has been parsed.\n");
};
var i = 0;

nano.db.destroy('mtgapp', function() {
// create a new database
    nano.db.create('mtgapp', function() {
      var db = nano.use('mtgapp');
      try {
        var file_buf = fs.readFileSync('../resources/cards.xml');
        // console.log('string ledia del fichero:' + file_buf.toString('utf8').substr(0,100));
        parser.write(file_buf.toString('utf8')).close();
        //Produce the JSON string
        JSON_string = JSON.stringify(data_array);
        data_array.forEach(function(item) {
            db.insert(item, null, function(err, body, header) {
             if(err) {
               console.log('error al insertar:' + err.message);
               return;
             }
           });
        });
        fs.writeFileSync('test.json', JSON_string.substr(0,1000));
      } catch(ex) {
        console.log('Error al parsear');
        console.log(ex);
      }
  });
});
