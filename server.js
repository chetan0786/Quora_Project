var express=require('express')
var app=express()
var path=require('path')
const port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    email:String,
    type:String,
    active:String
	
  })

var members =  mongoose.model('members', membersSchema);


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
  // console.log("profile"+profile)
  //   members.findOne({email:profile.emails.value}).then((currentUser)=>{
  //       if(currentUser){
  //           console.log('User is '+currentUser);
  //           done(null,currentUser);
  //       }
  //       else{
  //           /*If NOT we create a new User*/
  //           new members({
  //               name:profile.displayName,
  //               email:profile.emails[0].value,
  //               type:'user',
  //               active:'1'
  //               }).save().then((newUser)=>{
  //                       console.log('new UserCreated'+ newUser);
  //                       done(null,newUser);
  //                    })
  //          }
  //   })

  done(null,profile)
      
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

