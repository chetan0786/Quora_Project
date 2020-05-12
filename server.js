var express=require('express')
var app=express()
var path=require('path')
var session=require('express-session')
const url = require('url');
var ejs = require('ejs')
//pass
const port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));
//Bodyparser
app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
var middleFunctionAdmin = function(req, res, next){
    if(req.session.userType=='admin'&&req.session.isLogin==1){
      next();
   } else {
     res.redirect("/");
   }
  }

  var middleFunctionUser = function(req, res, next){
    if((req.session.userType=="user")&&req.session.isLogin==1){
      next();
   } else {
     res.redirect("/");
   }
  }




app.get('/login', (req, res) => {
    res.render('login',{
        user:null
    })
})
app.get('/', (req, res) => {
    
    return res.redirect('/login');
})

var mongoose=require('mongoose');

const uri = 'mongodb+srv://qoura:qoura@qoura-zgmdw.mongodb.net/test?retryWrites=true&w=majority';


mongoose.connect(uri);

mongoose.connection.on('error', (err) => {
    console.log('DB connection Error');
});

mongoose.connection.on('connected', (err) => {
    console.log('DB connected');
});

var membersSchema = new mongoose.Schema({
    name: String,
    email:{
      type:String,
      required:true
    },
    userType:String,
    active:String,
    image:{
        type:String
        }
	
  })


var storySchema=new mongoose.Schema({
  title:String,
  body:String,
  status:String,
  allowComments:Boolean,
  date:Date,
  username:String,
  userid:String,
  comments:[
  {
    commentBody:String,
    commentUser:String,
    commentDate:Date
  }

  ]


})

var members =  mongoose.model('members', membersSchema);

var stories =mongoose.model('stories',storySchema);


var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

app.use(passport.initialize());
app.use(passport.session());
app.use(session({secret:"Login"}));







passport.use(new GoogleStrategy({
    clientID: '68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com',
    clientSecret: 'rM2tIQo4jFMGY5e-Cq60rCwF',
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
   console.log("profile_+__")
    console.log(profile)
     members.findOne({email:profile.emails[0].value}).then((currentUser)=>{
         if(currentUser){
             console.log('User is '+currentUser);
             done(null,currentUser);
         }
         else{
             /*If NOT we create a new User*/
             new members({
                 name:profile.displayName,
                 email:profile.emails[0].value,
                 userType:'user',
                 active:'1',
                 image:profile.photos[0].value
                 }).save().then((newUser)=>{
                         console.log('new UserCreated'+ newUser);
                         done(null,newUser);
                      })
            }
     })
      
  }
));



//Error programs .. resolve later....
passport.serializeUser((user,done)=>{
    done(null,user.id)
})


passport.deserializeUser((id,done)=>{
    members.findById(id)
        .then((user)=>{
      done(null,user)  
    })
    .catch(error => {
      done(error);
    });
})

app.get('/auth/google',
  passport.authenticate('google', { scope: [ 'profile',
      , 'email' ]  }));



app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect(url.format({
       pathname:"/home",
       query: {
          "email": req.user.email,
          "userType": req.user.userType,
          "isLogin":1,
          "name":req.user.name
        }
     }));
  });


app.get('/home',function(req,res)
{
    console.log(req.query);
    req.session.isLogin = req.query.isLogin;
    req.session.email = req.query.email ;
    req.session.userType=req.query.userType;
    req.session.name=req.query.name;
    
	res.render('home',{
    user:req.query.email
  });


});


app.post('/addingstory',(req,res)=>
{

  var allow;
  if(req.body.allowComments)
    allow=true;
  else
    allow=false;

  const st={
    title:req.body.title,
    status:req.body.status,
    body:req.body.body,
    date:Date.now(),
    allowComments:allow,
    username:req.session.name,
    userid:req.session.email
  }

  new stories(st).save()
  .then(story=>
  {
    console.log(story);
     res.render('home',{
    user:req.session.email
  });

  })




 
})


app.get('/about',middleFunctionUser,(req,res)=>
{
  res.render('about',{
    user:req.session.email
  });
})

app.get('/add',middleFunctionUser,(req,res)=>
{
  res.render('addstories',{
    user:req.session.email
  });
})


 

app.get('/auth/logout',(req,res)=>
{
  req.session.destroy();
   

  res.redirect('/');
})


app.get('/verify',(req,res)=>
{

  res.redirect('google98c2703ae6999fe4.html');
})




app.listen(port);


// id:68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com
// secret:rM2tIQo4jFMGY5e-Cq60rCwF

