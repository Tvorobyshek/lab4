const User = require("./user");
const EventEmitter = require("events");
let currentDate = new Date();
let people;
const express = require("express"); 
const hbs = require("hbs");

const app = express();
const expressHbs = require("express-handlebars");
const urlencodedParser = express.urlencoded({extended: false});


const mysql = require("mysql2");
let listDocta;
let listRecords;
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "web",
  password: "admin"
}).promise();
connection.query("SELECT * FROM doctors")
  .then(([rows]) =>{
    listDocta = rows;
  })
  .catch(err =>{
    console.log(err);
  });
    connection.query(`SELECT * FROM record where day(slot) = ${currentDate.getDate()}`)
  .then(([rows]) =>{
    listRecords = rows;
  })
  .catch(err =>{
    console.log(err);
  });


app.engine("hbs", expressHbs.engine(
  {
      layoutsDir: "views/layouts", 
      defaultLayout: "layout",
      extname: "hbs"
  }
))
app.set("view engine", "hbs");
hbs.registerPartials(__dirname + "/views/partials");
app.get("/login", function(_, response){
     
    response.render("logIO",{
      title: "Авторизация",
      textButton: "Войти"
    });
});

app.get("/rec", function(rec,res){
  res.render("current",{
    listRecord: listRecords
  });
}
);

app.post("/login",urlencodedParser,function(request,response){
  if(!request.body) return response.sendStatus(400);
  people = new User(request.body.phone);
  checkuser();
  response.redirect("/menu");
});

app.get("/menu", function(request,response){
  console.log(people.getphone());
  response.render("home",{
    title: "Поликлиника",
    listDocta: listDocta
  });
});

app.post("/menu",urlencodedParser,function(request,response){
  if(!request.body) return response.sendStatus(400);
  console.log(request.body);
  var idDoctors = request.body.doctors.slice(0,request.body.doctors.indexOf(':'));
  var dates = request.body.date + " " + request.body.time+":00";
  var name = request.body.name;
  addRec(idDoctors,name,dates,response);
});

function addRec(idDoctors, name, date,response)
{
  let sql = `INSERT INTO record(idDoctor,name,slot,phoneUser) VALUES (${idDoctors},"${name}",'${date}',"${people.getphone()}")`;
  connection.query(sql)
    .then(result=>{
      console.log(result);
      response.render("home",{
        title: "Поликлиника",
        listDocta: listDocta,
        message: "Вы записаны"
      });
    })
    .catch(err=>{
      console.log(err);
      console.log(date);
      response.render("home",{
        title: "Поликлиника",
        listDocta: listDocta,
        message: "Это время занято"
      });
    });
    connection.query(`SELECT * FROM record where day(slot) = ${currentDate.getDate()}`)
    .then(([rows]) =>{
      listRecords = rows;
    })
    .catch(err =>{
      console.log(err);
    });
}

function checkuser()
{
  const sql = `SELECT phone from users where phone = "${people.getphone()}"`;
  connection.query(sql)
    .then(result=>{
      if(result[0].length == 0){
        console.log("такого пользователя нет");
        insUser();
      }
      else{
        console.log("пользователь зарегистрирован");
      }
    })
    .catch(err=>{
      console.log(err);
    });
}

function insUser()
{
  console.log(people);
  const sql = `INSERT INTO users(phone) VALUES("${people.getphone()}")`;
  connection.query(sql).then(result =>{
    console.log(result[0]);
  })
  .catch(err =>{
    console.log(err);
  });
}

const fs = require("fs");

function checktimerec()
{
  currentDate = new Date();
  connection.query("SELECT * FROM record")
  .then(([rows]) =>{
    listRecords = rows;
  })
  .catch(err =>{
    console.log(err);
  });
  if(listRecords != undefined){
    
    for(var i = 0; i<listRecords.length; i++)
    {
      var time = Math.floor((listRecords[i].slot - currentDate) / 3600000);
      console.log(time); 
      if( time == 24 || time == 2)
      {
        var docta = "";
        for(var j = 0; j<listDocta.length; j++){
          if(listRecords[i].idDoctors == listDocta[j].idDoctors)
            docta = listDocta[j].name;
        }
        var message = `${listRecords[i].name} ваша запись к врачу ${docta} через ${time} часа:текущее время ${currentDate}\n`
        fs.appendFile("./log/record.log",message, function(error){
          if(error){  // если ошибка
              return console.log(error);
          }
        });
      }
    }
  }
}
const interval = setInterval(checktimerec,3600000);


app.listen(3000, function(){ console.log("Сервер начал принимать запросы по адресу http://localhost:3000")});