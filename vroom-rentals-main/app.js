
//requiring the packages

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");




//initialisation and setiing view engine etc.
const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(session({
  secret:"Rocketcodesisawesome",
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());




//connection to DB
mongoose.connect("mongodb://localhost:27017/TravelToGetHerUpdated", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to local MongoDB");
}).catch((error) => {
  console.error("Error connecting to MongoDB:", error);
});


//creating userSchema and carSchema

const carSchema = mongoose.Schema({
  model:String,
  number:String,
  capacity:String,
  rent:String,
  status:{type:String,default:"Available"},
  customer:String,
  days:String,
  startdate:String,
  agency:String
});



const userSchema = new mongoose.Schema({
  username:String,
  password:String,
  name:String,
  role:{type:String,required:true,default:"User"},
  cars:[carSchema]
});




//adding plugin to the user Schema
userSchema.plugin(passportLocalMongoose);





//creating mongoose model
const Car = mongoose.model("Car",carSchema);
const User = mongoose.model("User",userSchema);




// passport strategies initialisation
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




//handling get requests

//homepage
app.get("/home",function(req,res){
  res.render("home");
});

app.get("/",function(req,res){
  res.render("home");
});

app.get("/ride",function(req,res){
  res.render("ride");
});

app.get("/about",function(req,res){
  res.render("about");
});



//register page
app.get("/register",function(req,res){
  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "User"){
      res.redirect("/userdashboard");
    }

    else{
      res.redirect("/agencydashboard");
    }
  }
  else{
    res.render("register");
  }
  
});



//login page
app.get("/login",function(req,res){
  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "User"){
      res.redirect("/userdashboard");
    }

    else{
      res.redirect("/agencydashboard");
    }
  }
  else{
    res.render("login");
  }

});




//bookcars page
app.get("/bookcars",function(req,res){


   if(req.isAuthenticated()){
     const role = req.user.role;
     if(role == "Agency"){
       res.redirect("/agencydashboard");
     }

     else{
       Car.find({status:{$ne:"Booked"}},function(err,cars){
         res.render("bookcars",{cars:cars});
       });
     }
   }

else{
  Car.find({status:{$ne:"Booked"}},function(err,cars){
    res.render("bookcars",{cars:cars});
  });
}


});




//booked cars page for Agency
app.get("/bookedcars",function(req,res){


  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "Agency"){

    const agencyid = req.user._id;

    User.findOne({_id:agencyid},function(err,foundAgency){
      const cars = foundAgency.cars;
      let bookedcars = cars.filter(function(currentCar){
        return currentCar.status == "Booked";
      });

    res.render("bookedcars",{cars:bookedcars});

    });


    }

    else{
      res.redirect("/bookcars");
    }

}
else{
   res.redirect("/login");
}
});





//userdashboard page
app.get("/userdashboard",function(req,res){
  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "User"){
      const userid = req.user._id;
      User.findOne({_id:userid},function(err,foundUser){
        res.render("userdashboard",{cars:foundUser.cars})
      });
    }

    else{
      res.redirect("/agencydashboard")
    }
  }


  else{
    res.redirect("/login");
  }
});






//agencydashboard page
app.get("/agencydashboard",function(req,res){
if(req.isAuthenticated()){
  const role = req.user.role;
  if(role == "Agency"){
    const agencyid = req.user._id;
    User.findOne({_id:agencyid},function(err,foundAgency){
      res.render("agencydashboard",{cars:foundAgency.cars})
    });
  }
  else{
    res.redirect("/userdashboard");
  }
}

else{
  res.redirect("/login");
}
});





//addnewcars page for Agency
app.get("/addnewcars",function(req,res){
  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "Agency"){
       res.render("addnewcars");
    }

    else{
      res.redirect("/bookcars");
    }
  }

  else{
    res.redirect("/login")
  }
});


app.get('/reviews', (req,res)=>{
  res.render('reviews');
})

//logout
app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
});










//handling POST requests



//regsiter page
app.post("/register",function(req,res){
  const userName = req.body.username;
  const passWord = req.body.password;
  const name = req.body.name;
  const role = req.body.role;

User.register({username:userName,name:name,role:role},passWord,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }

  else{
    passport.authenticate("local")(req,res,function(){
      if(role == "User"){
        res.redirect("/bookcars");
      }

      else{
        res.redirect("agencydashboard")
      }

    });
  }
});

});



// login page

app.post("/login",function(req,res){
  const userName = req.body.username;
  const passWord = req.body.password;

const user = new User({
  username:userName,
  password:passWord
});


req.login(user, function(err){
  if(err){
    console.log(err);
  }

  else{
      passport.authenticate("local")(req,res,function(){

      res.redirect("/home");

    });
  }
});

});






//addnewcars page for Agency
app.post("/addnewcars",function(req,res){

  if(req.isAuthenticated()){

     const role = req.user.role;

     if(role == "Agency"){
       const id = req.user._id;

   const car = new Car ({
     model:req.body.model,
     number:req.body.number,
     capacity:req.body.capacity,
     rent:req.body.rent,
     agency:req.user.username,

 });

 car.save();

 User.findOne({_id:id},function(err,foundUser){
   if(!err){
     foundUser.cars.push(car);
     foundUser.save();
     res.redirect("/agencydashboard");
   }
 });
     }

     else{
       res.redirect("/bookcars")
     }
  }


  else{
    res.redirect("/login");
  }
});







//bookcars page for User
app.post("/bookcars",function(req,res){
if(req.isAuthenticated()){
  const role = req.user.role;
  if(role == "User"){
    const book = req.body.book;
    Car.findOne({_id:book},function(err,car){
       if(!err){
         res.render("bookthiscar",{car:car});
       }
    });
  }
  else{
    res.redirect("/agencydashboard");
  }
}
else{
  res.redirect("/login");
}
});



//bookthiscar page for User
app.post("/bookthiscar",function(req,res){
   if(req.isAuthenticated()){
      const book = req.body.book;
      const agency = req.body.agency;
      const user = req.user.name;
      const startdate = req.body.startdate;
      const days = req.body.days;
      const car = new Car ({
        _id:book,
        model:req.body.model,
        number:req.body.number,
        capacity:req.body.capacity,
        rent:req.body.rent,
        startdate:startdate,
        days:days

    });
      User.findOne({_id:req.user._id},function(err,foundUser){
        if(!err){
          foundUser.cars.push(car);
          foundUser.save();
        }

      });
      Car.findOneAndUpdate({_id:book},{ $set: {"status":"Booked","customer":user,"startdate":startdate,"days":days}},function(err){
          if(!err){

             User.findOneAndUpdate({username:agency,"cars._id":book},{$set:{"cars.$.status":"Booked","cars.$.customer":user,"cars.$.startdate":startdate,"cars.$.days":days}},function(err){

                 if(!err){
                      res.redirect("/userdashboard");
                 }

                });
          }

      });

   }
   else{
     res.redirect("/login");
   }
});





//agencydashboard page for agency
app.post("/agencydashboard",function(req,res){
if(req.isAuthenticated()){
  const role = req.user.role;
    if(role == "Agency"){
       const carid = req.body.carid;
       Car.findOne({_id:carid},function(err,foundCar){
         res.render("updatethiscar",{car:foundCar});
       });

    }

    else{
      res.redirect("/userdashboard");
    }
}


else{
  res.redirect("/login");
}
});



//updatethiscar for agency
app.post("/updatethiscar",function(req,res){
  const id = req.body.update;
  const model = req.body.model;
  const number = req.body.number;
  const rent = req.body.rent;
  const status = req.body.status;
  const capacity = req.body.capacity;
  const agency = req.user.username;
 if(req.isAuthenticated()){


   Car.findOneAndUpdate({_id:id},{ $set: {"model":model,"number":number,"rent":rent,"status":status,"capacity":capacity}},function(err){
       if(!err){

          User.findOneAndUpdate({username:agency,"cars._id":id},{$set:{"cars.$.status":status,"cars.$.model":model,"cars.$.number":number,"cars.$.rent":rent,"cars.$.capacity":capacity}},function(err){

              if(!err){
                   console.log("Ok");
              }

             });
       }

   });




if(status == "Booked"){
  const customer = req.body.customer;
  User.findOneAndUpdate({name:customer,"cars._id":id},{$set:{"cars.$.status":status,"cars.$.model":model,"cars.$.number":number,"cars.$.rent":rent,"cars.$.capacity":capacity}},function(err){

      if(!err){
           res.redirect("/agencydashboard");
      }

     });
}


else{
  const customer = req.body.customer;
  User.findOneAndUpdate({name:customer},{$pull:{cars:{_id:id}}},function(err,foundUser){
  if(!err){
    res.redirect("/agencydashboard");
  }
});

}


 }
 else{
   res.redirect("/login");
 }

});



//cancel booking for user
app.post("/userdashboard",function(req,res){

  if(req.isAuthenticated()){
    const role = req.user.role;
    if(role == "User"){
        const carid = req.body.carid;
        const user = req.user._id;

        User.findOneAndUpdate({_id:user},{$pull:{cars:{_id:carid}}},function(err,foundUser){
        if(!err){
          console.log("Ok");
        }
      });

      Car.findOneAndUpdate({_id:carid},{ $set: {"status":"Available"}},function(err){
          if(!err){

             Car.findOne({_id:carid},function(err,foundCar){
               const agency = foundCar.agency;
               console.log(agency);
               User.findOneAndUpdate({username:agency,"cars._id":carid},{$set:{"cars.$.status":"Available"}},function(err){

                   if(!err){
                        res.redirect("/userdashboard");
                   }

                  });
             });
          }

      });

    }
    else{
      res.redirect("/agencydashboard");
    }
  }

  else{
    res.redirect("/login");
  }

});

app.get('*', (req,res)=>{
  res.render('404');
})

//setting up server
app.listen(process.env.PORT||3000,function(){
  console.log("Server started.......");
});
