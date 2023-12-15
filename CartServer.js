var express = require("express");
var app = express();
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept,Authorization",
  );
    res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD"
  );
  next();
});
var port = process.env.PORT||2410;
app.listen(port, () => console.log(`Node app listening on port ${port}!`));
const _ = require("lodash");

let {mobiles,pinCodes,reviews} = require("./Cart.js");
const jwt = require("jsonwebtoken");
let passport = require("passport")
let localStrategy = require("passport-jwt").Strategy
let ExtractJwt = require("passport-jwt").ExtractJwt;
let expiryTime = 30000;
let pageSize=14;

let wishList = [];
let orders=[];

app.use(passport.initialize());

let users=[{email:"test@gmail.com",password:"test123",role:"user",fname:"Agastya",lname:"Sharma",gender:"Male",mobile:"43781269471"}];

let params = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "secretKey009",
}

let StrategyAll = new localStrategy(params,function(token,done){
  let user = users.find((a)=>a.email === token.email);
  if(!user){
    return done(null,false,{message:"Check email or password"});
  }else{
    return done(null,user);
  }
})

passport.use("roleAll",StrategyAll);

app.get("/products/:category/:brand",function(req,res){
    let {category,brand} = req.params;
    let {assured,ram,rating,price,sort,page,q} = req.query;
    let data = mobiles;
    let pageNum = +page;
    if(q){
      data = data.filter((a)=>a.name.includes(q));
    }
    if(ram){
      switch(ram){
        case ">=6" : data = data.filter((a)=>a.ram>=6); break;
        case "<=4" : data = data.filter((a)=>a.ram<=4); break;
        case "<=3" : data = data.filter((a)=>a.ram<=3); break;
        case "<=2" : data = data.filter((a)=>a.ram<=2); break;
        default : break;
      }
    }
    if(rating){
      switch(rating){
        case ">4" : data = data.filter((a)=>parseFloat(a.rating)>4); break;
        case ">3" : data = data.filter((a)=>parseFloat(a.rating)>3); break;
        case ">2" : data = data.filter((a)=>parseFloat(a.rating)>2); break;
        case ">1" : data = data.filter((a)=>parseFloat(a.rating)>1); break;
        default : break;
      }
    }
    if(price){
      switch(price){
        case "0-5000" : data = data.filter((a)=>a.price<5000); break;
        case "5000-10000" : data = data.filter((a)=>a.price>5000 && a.price<10000); break;
        case "10000-20000" : data = data.filter((a)=>a.price>10000 && a.price<20000); break;
        case "20000" : data = data.filter((a)=>a.price>20000); break;
        default : break;
      }
    }
    if(sort){
      switch(sort){
        case "asc" : data = data.sort((a,b)=>a.price - b.price ); break;
        case "desc" : data = data.sort((a,b)=>b.price - a.price ); break;
        case "popularity" : data = data.sort((a,b)=>a.popularity - b.popularity ); break;
        default : break;
      }
    }
    if(assured){
      data = data.filter((a)=>a.assured===true)
    }
    let product = data.filter((a)=>a.category===category && a.brand === brand);
    res.send(makeData(product,pageSize,pageNum));
});

let makeData=(data,size,page)=>{
  let startIdx = (page-1)*size;
  let endIdx = data.length > startIdx+size-1 ? startIdx+size-1 : data.length-1;
  let data1 = data.filter((a,index)=> index>=startIdx && index<=endIdx );
  let totalPages = Math.ceil(data.length/size);
  let fullData={
    data:data1,
    page:page,
    totalItems : data1.length,
    totalNum : data.length,
    totalPages : totalPages,
  }
  return fullData;
};

app.get("/deals",function(req,res){
  let randomData = _.sampleSize(mobiles,14);
  res.send(randomData);
})

app.get("/product/:productId",function(req,res){
  let {productId} = req.params;
  let product =  mobiles.find((a)=>a.id === productId);
  if(product) res.send(product);
  else res.status(404).send("No data Found");
})

app.get("/pincode/:pincode/:productId",function(req,res){
  let pincode = +req.params.pincode;
  let productId = req.params.productId;
  let pr = pinCodes.find((a)=>a.pincode===pincode && a.mobileList.some((b)=> b.id===productId));
  res.send(pr ? pr.mobileList.find((a)=>a.id === productId).display : "Product not found for the given pincode");
})
app.get("/reviews/:productId",function(req,res){
  let {productId} = req.params;
  let product = reviews.find((a)=>a.mobileId===productId);
  res.send(product);
})

app.post("/user",function(req,res){
  let {email,password} = req.body;
  let user = users.find((a)=>a.email === email && a.password === password);
  if(user){
    let payload = {email:user.email}
    let token = jwt.sign(payload,params.secretOrKey,{
      algorithm:"HS256",
      expiresIn:expiryTime,
    })
    res.send(token);
  }else{
    res.sendStatus(401);
  }
});

app.get("/user",passport.authenticate("roleAll",{session:false}),function(req,res){
  res.send(req.user);
})

app.post("/wishlist",passport.authenticate("roleAll",{session:false}),function(req,res){
  let body = req.body;
  let index = wishList.findIndex((a)=> a.id === body.id );
  if(index>=0){
    wishList.splice(index,1)
  }
  else{
    let newItem = {...body,email:req.user.email};
    wishList.push(newItem);
  };
  res.send(wishList);
});
app.get("/wishlist",passport.authenticate("roleAll",{session:false}),function(req,res){
  let list = wishList.filter((a)=>a.email === req.user.email);
  res.send(list);
})

app.post("/orders", passport.authenticate("roleAll", { session: false }), function (req, res) {
  let orderArray = req.body;
  let newOrders = orderArray.map((order) => ({ ...order, email: req.user.email }));
  orders.push(...newOrders);
  res.send(orders);
});

app.get("/orders", passport.authenticate("roleAll", { session: false }), function (req, res) {
  let userOrders = orders.filter((order) => order.email === req.user.email);
  res.send(userOrders);
});
