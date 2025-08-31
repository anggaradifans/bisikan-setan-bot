/**
 * Module dependencies.
 */
import dateFormat from "dateformat";
import styles from "ansi-styles";

/**
 * Expose easynodelog
 */

function easynodelog() {
  var self = this;

  this.FILENAME = "";
  this.LINENUMBER = "";

  this.debug = true; // show/hide logs
  this.select = ["info", "warn", "error", "log", "success", "system"]; // choose which logs to show
  (this.writeFile = false), // enable/disable write to log file
    (this.file = "easynodelog.log"); // write every visible log to this file
  this.types = {
    log: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.log.log", // specify a log file for this type
      logFormat: "%d %scyan%t%ecyan [%syellow%f:%l%eyellow] %m",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "LOG"
    },
    info: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.info.log", // specify a log file for this type
      logFormat: "%d %scyan%t%ecyan [%syellow%f:%l%eyellow] %scyan%m%ecyan",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "INFO"
    },
    warn: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.warn.log", // specify a log file for this type
      logFormat:
        "%d %syellow%t%eyellow [%syellow%f:%l%eyellow] %syellow%m%eyellow",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "WARN"
    },
    error: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.error.log", // specify a log file for this type
      logFormat:
        "%d %sbgred%swhite%t%ewhite%ebgred [%syellow%f:%l%eyellow] %sred%m%ered",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "ERROR"
    },
    success: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.success.log", // specify a log file for this type
      logFormat: "%d %sgreen%t%egreen [%syellow%f:%l%eyellow] %sgreen%m%egreen",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "SUCCESS"
    },
    system: {
      writeFile: false, // enable/disable write to log file
      file: "easynodelog.system.log", // specify a log file for this type
      logFormat: "%d %sgray%t%egray [%syellow%f:%l%eyellow] %sgray%m%egray",
      dateFormat: "yyyy-mm-dd hh:MM:ss.l",
      name: "SYSTEM"
    }
  };
  this.generateFunctions = function generateFunctions() {
    for (var i in this.types) {
      this[i] = new Function(
        "return function " +
          i +
          "(){\n" +
          "this.FILENAME = __stack[2].getFileName();\n" +
          'this.FILENAME = this.FILENAME.replace(new RegExp(process.cwd(), "g"), "");\n' +
          "this.FILENAME = this.FILENAME.substr(1);\n" +
          "this.LINENUMBER = new Error().stack;\n" +
          "this.LINENUMBER = this.LINENUMBER.substr(this.LINENUMBER.indexOf(this.FILENAME)+this.FILENAME.length+1,10);\n" +
          'this.LINENUMBER = this.LINENUMBER.replace(/[^0-9:]/g, "");\n' +
          "var args = this.argumentsToString(arguments);\n" +
          "this.printLog(arguments.callee.toString().match(/function ([^(]+)/)[1], args);\n" +
          "}"
      )();
    }
  };

  this.generateFunctions();

  this.addType = function addType(type, config) {
    if (!config) {
      config = {};
    }
    this.types[type] = {};
    if (!config.hasOwnProperty("writeFile")) {
      this.types[type].writeFile = false;
    } else {
      this.types[type].writeFile = config.writeFile;
    }
    if (!config.hasOwnProperty("file")) {
      this.types[type].file = "easynodelog." + type + ".log";
    } else {
      this.types[type].file = config.file;
    }
    if (!config.hasOwnProperty("logFormat")) {
      this.types[type].logFormat =
        "%d %scyan%t%ecyan [%syellow%f:%l%eyellow] %m";
    } else {
      this.types[type].logFormat = config.logFormat;
    }
    if (!config.hasOwnProperty("dateFormat")) {
      this.types[type].dateFormat = "yyyy-mm-dd hh:MM:ss.l";
    } else {
      this.types[type].dateFormat = config.dateFormat;
    }
    if (!config.hasOwnProperty("name")) {
      this.types[type].name = type;
    } else {
      this.types[type].name = config.name;
    }
    // if (this.select.indexOf(this.types[type].name) === -1) {
    //  this.select.push(this.types[type].name);
    // }
    this.generateFunctions();
  };

  this.getDate = function getDate(type) {
    if (type && this.types.hasOwnProperty(type)) {
      return dateFormat(new Date(), this.types[type].dateFormat);
    }
    return "";
  };

  this.computeLog = function computeLog(name, message) {
    var str = "";
    if (name && this.types.hasOwnProperty(name)) {
      str = this.types[name].logFormat;
      // chalk modifiers
      str = str.replace(new RegExp("%sreset", "g"), styles.reset.open);
      str = str.replace(new RegExp("%ereset", "g"), styles.reset.close);
      str = str.replace(new RegExp("%sbold", "g"), styles.bold.open);
      str = str.replace(new RegExp("%ebold", "g"), styles.bold.close);
      str = str.replace(new RegExp("%sdim", "g"), styles.dim.open);
      str = str.replace(new RegExp("%edim", "g"), styles.dim.close);
      str = str.replace(new RegExp("%sitalic", "g"), styles.italic.open);
      str = str.replace(new RegExp("%eitalic", "g"), styles.italic.close);
      str = str.replace(new RegExp("%sunderline", "g"), styles.underline.open);
      str = str.replace(new RegExp("%eunderline", "g"), styles.underline.close);
      str = str.replace(new RegExp("%sinverse", "g"), styles.inverse.open);
      str = str.replace(new RegExp("%einverse", "g"), styles.inverse.close);
      str = str.replace(new RegExp("%shidden", "g"), styles.hidden.open);
      str = str.replace(new RegExp("%ehidden", "g"), styles.hidden.close);
      str = str.replace(
        new RegExp("%sstrikethrough", "g"),
        styles.strikethrough.open
      );
      str = str.replace(
        new RegExp("%estrikethrough", "g"),
        styles.strikethrough.close
      );
      // chalk colors
      str = str.replace(new RegExp("%sblack", "g"), styles.black.open);
      str = str.replace(new RegExp("%eblack", "g"), styles.black.close);
      str = str.replace(new RegExp("%sred", "g"), styles.red.open);
      str = str.replace(new RegExp("%ered", "g"), styles.red.close);
      str = str.replace(new RegExp("%sgreen", "g"), styles.green.open);
      str = str.replace(new RegExp("%egreen", "g"), styles.green.close);
      str = str.replace(new RegExp("%syellow", "g"), styles.yellow.open);
      str = str.replace(new RegExp("%eyellow", "g"), styles.yellow.close);
      str = str.replace(new RegExp("%sblue", "g"), styles.blue.open);
      str = str.replace(new RegExp("%eblue", "g"), styles.blue.close);
      str = str.replace(new RegExp("%smagenta", "g"), styles.magenta.open);
      str = str.replace(new RegExp("%emagenta", "g"), styles.magenta.close);
      str = str.replace(new RegExp("%scyan", "g"), styles.cyan.open);
      str = str.replace(new RegExp("%ecyan", "g"), styles.cyan.close);
      str = str.replace(new RegExp("%swhite", "g"), styles.white.open);
      str = str.replace(new RegExp("%ewhite", "g"), styles.white.close);
      str = str.replace(new RegExp("%sgray", "g"), styles.gray.open);
      str = str.replace(new RegExp("%egray", "g"), styles.gray.close);
      // chalk background colors
      str = str.replace(new RegExp("%sbgblack", "g"), styles.bgBlack.open);
      str = str.replace(new RegExp("%ebgblack", "g"), styles.bgBlack.close);
      str = str.replace(new RegExp("%sbgred", "g"), styles.bgRed.open);
      str = str.replace(new RegExp("%ebgred", "g"), styles.bgRed.close);
      str = str.replace(new RegExp("%sbggreen", "g"), styles.bgGreen.open);
      str = str.replace(new RegExp("%ebggreen", "g"), styles.bgGreen.close);
      str = str.replace(new RegExp("%sbgyellow", "g"), styles.bgYellow.open);
      str = str.replace(new RegExp("%ebgyellow", "g"), styles.bgYellow.close);
      str = str.replace(new RegExp("%sbgblue", "g"), styles.bgBlue.open);
      str = str.replace(new RegExp("%ebgblue", "g"), styles.bgBlue.close);
      str = str.replace(new RegExp("%sbgmagenta", "g"), styles.bgMagenta.open);
      str = str.replace(new RegExp("%ebgmagenta", "g"), styles.bgMagenta.close);
      str = str.replace(new RegExp("%sbgcyan", "g"), styles.bgCyan.open);
      str = str.replace(new RegExp("%ebgcyan", "g"), styles.bgCyan.close);
      str = str.replace(new RegExp("%sbgwhite", "g"), styles.bgWhite.open);
      str = str.replace(new RegExp("%ebgwhite", "g"), styles.bgWhite.close);

      str = str.replace(new RegExp("%d", "g"), this.getDate(name));
      str = str.replace(new RegExp("%t", "g"), this.types[name].name);
      str = str.replace(new RegExp("%f", "g"), this.FILENAME);
      str = str.replace(new RegExp("%l", "g"), this.LINENUMBER);
      str = str.replace(new RegExp("%m", "g"), message);
    }
    return str;
  };

  this.printLog = function printLog(name, message) {
    if (self.debug && this.select.indexOf(name) > -1) {
      console.log(this.computeLog(name, message));
    }
  };
  this.argumentsToString = function argumentsToString(args) {
    var str = "";
    for (var i in args) {
      if (args.hasOwnProperty(i)) {
        try {
          if (args[i].constructor.name == "model") {
            args[i] = args[i].toObject();
          }
          if (args[i].constructor.name.indexOf("rror") > -1) {
            str += self.getStackTrace(args[i]);
          } else if (typeof args[i] === "object") {
            try {
              str += "\n" + JSON.stringify(args[i]) + " "; //add formatting > JSON.stringify(args[i], null, 4)
            } catch (e) {
              str += args[i];
            }
          } else {
            str += args[i] + " ";
          }
        } catch (e) {
          str += args[i] + " ";
        }
      }
    }
    return str;
  };

  this.getStackTrace = function getStackTrace(err) {
    let stack = err.stack || new Error().stack || "";
    stack = stack
      .split("\n")
      .map(function(line) {
        return line.trim();
      })
      .filter(function(line) {
        return line.indexOf("easynodelog") === -1;
      });
    stack = stack.splice(stack[0] == "Error" ? 2 : 1).join("\n");
    return err.message + "\n" + stack;
  };
}

if (!global.__stack) {
  Object.defineProperty(global, "__stack", {
    get: function() {
      var orig = Error.prepareStackTrace;
      Error.prepareStackTrace = function(_, stack) {
        return stack;
      };
      var err = new Error();
      // Error.captureStackTrace(err, this);
      var stack = err.stack;
      Error.prepareStackTrace = orig;
      return stack;
    }
  });
}

export const debug = new easynodelog();
