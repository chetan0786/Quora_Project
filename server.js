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

app.set('views', path.join(__dirname, 'Views'));
app.set('view engine', 'ejs');



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

var members =  mongoose.model('members', membersSchema);


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
          "isLogin":1
        }
     }));
  });


app.get('/home',function(req,res)
{
    console.log(req.query);
    req.session.isLogin = req.query.isLogin;
    req.session.email = req.query.email ;
    req.session.userType=req.query.userType;
	res.redirect('home.html');
});





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











app.listen(port);


// id:68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com
// secret:rM2tIQo4jFMGY5e-Cq60rCwF

