// Description:
//   hubot (query) interface to google spreadsheet (*with* authentication)
//
// more info/usage see: https://github.com/coderofsalvation/hubot-script-spreadsheet
//
// Author:
//   coder of salvation

module.exports = function(robot) {

  var Spreadsheet = require('edit-google-spreadsheet');
  var Url         = require('url');
  var ITEMS_KEY   = "spreadsheet_urls";
  var Table       = require('easy-table');
  var MAXROWS     = 6; // prevent flooding

  function nickname(msg, match) {
      if (!match || match.toLowerCase().trim() === "me") {
          return msg.message.user && msg.message.user.name || "unknown";
      }
      return match;
  }

  function getItems(){
    var items = robot.brain.get( ITEMS_KEY );
    if( !items ){
      items = {};
      robot.brain.set( ITEMS_KEY, items );
    }
    return items;
  }
  
  robot.respond(/spreadsheet$/i, function(msg) {
     var items = getItems();
     var str  = "shows/queries spreadsheets\n";
     str += "usage: "+ robot.name + " <name> [searchstring]\n";
     str += "       "+ robot.name + " save <name> <spreadsheetname>|<sheet>|<columnnames rownumber>|<url>\n";
     str += "       "+ robot.name + " delete  <name>\n";
     str += "\navailable sheets:";
     var sheets = [];
     for( i in items ) sheets.push(i);
     str+= " "+ sheets.join(",");
     msg.send(str);
  });
  
  robot.respond(/spreadsheet delete (\w+)\s?(.*)$/i, function(msg) {
     var name = msg.match[1].toLowerCase()
     var url  = msg.match[2];
     var items = getItems();
     items[name] = url;
     delete items[name];
     robot.brain.set( ITEMS_KEY, items );
     return msg.send(name+" removed");
  });

  robot.respond(/spreadsheet save (\w+) (.*)$/i, function(msg) {
     var shortname = msg.match[1];
     var parts = msg.match[2].split("|");
     if( parts.length != 4 ) return msg.send("incorrect parameters given");
     var data = {
       "shortname": shortname,
       "name": parts[0],
       "sheet": parts[1],
       "columnrow": parts[2],
       "url": parts[3]
     };
     var items = getItems();
     items[ shortname ] = data;
     robot.brain.set( ITEMS_KEY, items );
     return msg.send(shortname+" saved");
  });
  
  robot.respond(/spreadsheet (.*)/i, function(msg) {
     var parts  = msg.match[1].split(" ");
     var name   = parts[0];
     if( name == "delete" || name == "save" ) return;
     var search = parts.length > 1 ? parts[1].substr(1,parts[1].length-1) : false;  
     var items = getItems();
     var data  = items[name];
     if( !data ) return msg.send(name+" was not found");

     Spreadsheet.load({
       debug: true,
       spreadsheetName: data.name,
       worksheetName: data.sheet,
       // Choose from 1 of the 3 authentication methods:
       //    1. Username and Password
       username: process.env.GOOGLE_SPREADSHEET_LOGIN,
       password: process.env.GOOGLE_SPREADSHEET_PASSWD,
     }, function sheetReady(err, spreadsheet) {
       spreadsheet.receive({ getValues: true },function(err, rows, info) {
         if(err) throw err;
         var t     = new Table; 
         var columns = rows[data.columnrow];
         var start = parseInt(data.columnrow)+1;
         for( i = start; i < start+MAXROWS; i++ ){
           var empty=true;
           for( column in columns ){
             if( rows[i] != undefined && ( !search || rowContains(rows[i],search) ) ){
               t.cell( columns[column], rows[i][column] != undefined ? rows[i][column] : "" );
               empty = false;
             }
           }
           if(!empty) t.newRow();
         }
         return msg.send(t.toString()+"\nsource: "+data.url);
       });
     });
  });

  function rowContains( row, searchstr ){
    for( col in row )
      if( String(row[col]).match( new RegExp(searchstr,"gi") ) ) return true; 
    return false;
  }

};
