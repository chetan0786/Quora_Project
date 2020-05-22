var express=require('express')
var app=express()
var path=require('path')
var session=require('express-session')
const url = require('url');
var ejs = require('ejs');
var moment = require('moment');
const methodOverride = require('method-override');


//pass
const port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));


//Bodyparser
app.use(express.urlencoded({extended: true}));
app.use(express.json());


//MethodOverride Middleware
app.use(methodOverride('_method'))


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


var members =  mongoose.model('members', membersSchema);

var storySchema=new mongoose.Schema({
  title:String,
  body:String,
  status:String,
  allowComments:Boolean,
  date:Date,
  author:membersSchema,
  username:String,
  userid:String,
  comments:[
  {
    commentBody:String,
    commentUser:membersSchema,
    commentDate:Date
  }

  ]


})



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
    
	 return res.redirect('/dashboard');
  


});










// Stories Index my stories
app.get('/stories/my', (req, res) => {
  stories.find({userid:req.session.email})
    .then(story => {
      
        res.render('stories/my', {
         stories: story,
         user:req.session.name,
    
      })
      
    });
});



// Stories Index Specific user
app.get('/stories/user/:id', (req, res) => {
  stories.find({userid:req.params.id})
    .then(story => {
      
        res.render('stories/user', {
         stories: story,
         user:req.session.name,
    
      })
      
    });
});

app.post('/stories/comment/:id',(req,res)=>
{
	console.log(req.params.id);
	
	members.find({email:req.session.email})
	.then(data=>{
		//console.log(data);
	
		stories.findOneAndUpdate(
	{
		_id: req.params.id
	},
	{
		$push :{comments:{
		commentBody:req.body.commentBody,
		commentUser:data[0],
		commentDate:Date.now()
	}}
	})
	.then((data)=>
	{
		console.log(data);
		res.redirect('/stories/show/'+req.params.id);
	})
	})
	
})




// Stories Index
app.get('/stories', (req, res) => {
  stories.find({status:'public'})
    .populate('user')
    .then(story => {
      
        res.render('stories/index', {
         stories: story,
         user:req.session.name,
    
      })
      
    });
});




// Show Single Story
app.get('/stories/show/:id', (req, res) => {
  stories.findOne({
    _id: req.params.id
  })
  .populate('user')
  .then(userStory => {
    res.render('stories/show', {
      story: userStory,
        user:req.session.name,
        moment:moment
    });
  });
});





app.get('/dashboard', middleFunctionUser,(req, res) => {
  stories.find({
     userid:req.session.email
  })
  .then(userStories => {
    res.render('dashboard', {
      stories: userStories,
        user:req.session.name,
        moment:moment,
        username:req.session.name
    });
  });
});






// Edit Single Story
app.get('/stories/edit/:id', (req, res) => {
  stories.findOne({
    _id: req.params.id
  })
  .populate('user')
  .then(userStory => {
    res.render('stories/edit', {
        story: userStory,
        user:req.session.name,
        moment:moment
    });
  });
});



app.put('/stories/:id', (req, res) => {
  stories.findOne({
    _id: req.params.id
  })
  .then(story => {
        var allow;
        if(req.body.allowComments)
            allow=true;
        else
            allow=false;
      
      //set new values
      story.title = req.body.title;
      story.body = req.body.body;
      story.status = req.body.status;
      story.allowComments = allow;
      
      
      story.save().then(story=>{
          res.redirect('/dashboard')
      })
      
  });
});



app.delete('/stories/:id', (req, res) => {
  stories.remove({
    _id: req.params.id
  })
  .then(()=>{
          res.redirect('/dashboard')
      })     
});









app.post('/addingstory',(req,res)=>
{

  var allow;
  if(req.body.allowComments)
    allow=true;
  else
    allow=false;
    
    
    
    members.findOne({email:req.session.email})
    .then(storyAuthor=>{
        
        
        const st={
    title:req.body.title,
    status:req.body.status,
    body:req.body.body,
    date:Date.now(),
    author:storyAuthor,
    allowComments:allow,
    username:req.session.name,
    userid:req.session.email
  }

  new stories(st).save()
  .then(story=>
  {
    console.log(story);
    sendNotification(message);
    res.redirect('/dashboard')

    })
    

  
  })




 
})


app.get('/about',(req,res)=>
{
  res.render('about',{
    user:req.session.name
  });
})

app.get('/add',middleFunctionUser,(req,res)=>
{
  res.render('addstories',{
    user:req.session.name
  });
})


app.get('/news',middleFunctionUser,(req,res)=>
{
	res.render('news',{
		user:req.session.name
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


var sendNotification = function(data) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Basic MTlmODQyYjUtYjhhZS00YzI5LTg1MjctZjUzMTUwY2IxYzVk"
  };
  
  var options = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headers
  };
  
  var https = require('https');
  var req = https.request(options, function(res) {  
    res.on('data', function(data) {
      console.log("Response:");
      console.log(JSON.parse(data));
    });
  });
  
  req.on('error', function(e) {
    console.log("ERROR:");
    console.log(e);
  });
  
  req.write(JSON.stringify(data));
  req.end();
};

var message = { 
  app_id: "4a426ee2-1255-494f-929c-67bf4ef82e13",
  contents: {"en": "Hey! New Story is Added. Check Fast.."},
  included_segments: ["All"]
};













app.listen(port);


// id:68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com
// secret:rM2tIQo4jFMGY5e-Cq60rCwF

