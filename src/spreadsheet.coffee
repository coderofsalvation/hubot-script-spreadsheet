# Description:
#   hubot (query) interface to google spreadsheet (*with* authentication)
#
# more info/usage see: https://github.com/coderofsalvation/hubot-script-spreadsheet
#
# Author: coder of salvation
#   
# Commands:
#   hubot spreadsheet - commands to query google spreadsheets
# 
module.exports = (robot) ->
  # prevent flooding
  nickname = (msg, match) ->
    return msg.message.user and msg.message.user.name or "unknown"  if not match or match.toLowerCase().trim() is "me"
    match
  getItems = ->
    items = robot.brain.get(ITEMS_KEY)
    unless items
      items = {}
      robot.brain.set ITEMS_KEY, items
    items
  #parts[1].substr(1,parts[1].length-1) : false;  
  
  # Choose from 1 of the 3 authentication methods:
  #    1. Username and Password
  rowContains = (row, searchstr) ->
    for col of row
      continue
    false
  Spreadsheet = require("edit-google-spreadsheet")
  Url = require("url")
  ITEMS_KEY = "spreadsheet_urls"
  Table = require("easy-table")
  MAXROWS = 60
  robot.respond /spreadsheet$/i, (msg) ->
    items = getItems()
    str = "shows/queries spreadsheets\n"
    str += "usage: " + robot.name + " <name> [searchstring]\n"
    str += "       " + robot.name + " save <name> <spreadsheetname>|<sheet>|<columnnames rownumber>|<url>\n"
    str += "       " + robot.name + " delete  <name>\n"
    str += "\navailable sheets:"
    sheets = []
    for i of items
      sheets.push i
    str += " " + sheets.join(",")
    msg.send str
    return

  robot.respond /spreadsheet delete (\w+)\s?(.*)$/i, (msg) ->
    name = msg.match[1].toLowerCase()
    url = msg.match[2]
    items = getItems()
    items[name] = url
    delete items[name]

    robot.brain.set ITEMS_KEY, items
    msg.send name + " removed"

  robot.respond /spreadsheet save (\w+) (.*)$/i, (msg) ->
    shortname = msg.match[1]
    parts = msg.match[2].split("|")
    return msg.send("incorrect parameters given")  unless parts.length is 4
    data =
      shortname: shortname
      name: parts[0]
      sheet: parts[1]
      columnrow: parts[2]
      url: parts[3]

    items = getItems()
    items[shortname] = data
    robot.brain.set ITEMS_KEY, items
    msg.send shortname + " saved"

  robot.respond /spreadsheet (.*)/i, (msg) ->
    parts = msg.match[1].split(" ")
    name = parts[0]
    return  if name is "delete" or name is "save"
    search = (if parts.length > 1 then parts[1] else false)
    items = getItems()
    data = items[name]
    return msg.send(name + " was not found")  unless data
    Spreadsheet.load
      debug: true
      spreadsheetName: data.name
      worksheetName: data.sheet
      username: process.env.GOOGLE_SPREADSHEET_LOGIN
      password: process.env.GOOGLE_SPREADSHEET_PASSWD
    , sheetReady = (err, spreadsheet) ->
      return msg.send("cannot find sheet")  unless spreadsheet?
      spreadsheet.receive
        getValues: true
      , (err, rows, info) ->
        throw err  if err
        t = new Table
        nrows = 0
        for i of rows
          nrows++
        columns = rows[data.columnrow]
        start = parseInt(data.columnrow) + 1
        end = (if search then nrows - 1 else start + MAXROWS)
        i = start
        while i < end
          empty = true
          for column of columns
            if rows[i]? and (not search or rowContains(rows[i], search))
              t.cell columns[column], (if rows[i][column]? then rows[i][column] else "")
              empty = false
          t.newRow()  unless empty
          i++
        msg.send t.toString() + "\nsee all results @ " + data.url

      return

    return

  return
