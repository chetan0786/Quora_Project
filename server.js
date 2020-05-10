var express=require('express')
var app=express()
var path=require('path')
const port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://qoura:<password>@qoura-zgmdw.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  
  client.close();
});


var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user,done)=>{
    done(null,user.id)
})



passport.use(new GoogleStrategy({
    clientID: '68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com',
    clientSecret: 'rM2tIQo4jFMGY5e-Cq60rCwF',
    callbackURL: "/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
  //	console.log(profile)


      return done(null,profile);
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));


app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/home');
  });


app.get('/home',function(req,res)
{
	res.redirect('home.html');
});



app.listen(port);


// id:68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com
// secret:rM2tIQo4jFMGY5e-Cq60rCwF

