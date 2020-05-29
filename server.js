const port = process.env.PORT || 5000;
var express = require('express')
var app = express()
var server = app.listen(port);
var path = require('path')
var session = require('express-session')
const url = require('url');
var ejs = require('ejs');
var moment = require('moment');
const methodOverride = require('method-override');
var nodemailer = require('nodemailer');
var io = require('socket.io').listen(server);



var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'contact.writingdesk@gmail.com',
        pass: 'admin@wd'
    }
});







//pass

app.use(express.static(path.join(__dirname, 'public')));


//Bodyparser
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());


//MethodOverride Middleware
app.use(methodOverride('_method'))


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
var middleFunctionAdmin = function(req, res, next) {
    if (req.session.userType == 'admin' && req.session.isLogin == 1) {
        next();
    } else {
        res.redirect("/");
    }
}

var middleFunctionUser = function(req, res, next) {
    if ((req.session.userType == "user") && req.session.isLogin == 1) {
        next();
    } else {
        res.redirect('/');
    }
}




app.get('/login', (req, res) => {
    res.render('login', {
        user: null
    })
})
app.get('/', (req, res) => {

    return res.redirect('/login');
})

var mongoose = require('mongoose');

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
    email: {
        type: String,
        required: true
    },
    userType: String,
    active: String,
    followers: [],
    about: String,
    storyRequests: [],
    following: [],
    image: {
        type: String
    }

})


var members = mongoose.model('members', membersSchema);

var storySchema = new mongoose.Schema({
    title: String,
    body: String,
    status: String,
    allowComments: Boolean,
    date: Date,
    keywords: [],
    author: membersSchema,
    username: String,
    userid: String,
    likedBy: [],
    comments: [{
            commentBody: String,
            commentUser: membersSchema,
            commentDate: Date
        }

    ]


})



var stories = mongoose.model('stories', storySchema);


var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

app.use(passport.initialize());
app.use(passport.session());
app.use(session({
    secret: "Login"
}));

///^&*678
users = [];
connections = [];
io.sockets.on('connection', function(socket) {
    connections.push(socket)
    console.log('Connected : %s socket connected', connections.length);


    //disconnect
    socket.on('disconnect', function(data) {
        //        if(!socket.username) return;
        users.splice(users.indexOf(socket.username), 1)
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length)
    });
    //Send Message
    socket.on('send message', function(data, userimg, username) {

        io.sockets.emit('new message', {
            msg: data,
            img: userimg,
            name: username
        });
    });
    //new user
    socket.on('new user', function(data, callback) {

        callback(true)
        socket.username = data;
        users.push(socket.username);
        updateUsernames();
    });


    function updateUsernames() {
        io.sockets.emit('get users', users);
    }

});




passport.use(new GoogleStrategy({
        clientID: '68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com',
        clientSecret: 'rM2tIQo4jFMGY5e-Cq60rCwF',
        callbackURL: "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        console.log("profile_+__")
        console.log(profile)
        members.findOne({
            email: profile.emails[0].value
        }).then((currentUser) => {
            if (currentUser) {
                console.log('User is ' + currentUser);
                done(null, currentUser);
            } else {
                /*If NOT we create a new User*/
                new members({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    userType: 'user',
                    about: ' Hey there, Im a writer on Writing Desk.',
                    active: '1',
                    image: profile.photos[0].value
                }).save().then((newUser) => {
                    console.log('new UserCreated' + newUser);
                    done(null, newUser);
                })
            }
        })

    }
));



//Error programs .. resolve later....
passport.serializeUser((user, done) => {
    done(null, user.id)
})


passport.deserializeUser((id, done) => {
    members.findById(id)
        .then((user) => {
            done(null, user)
        })
        .catch(error => {
            done(error);
        });
})

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', , 'email']
    }));



app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/'
    }),
    function(req, res) {
        res.redirect(url.format({
            pathname: "/home",
            query: {
                "email": req.user.email,
                "userType": req.user.userType,
                "isLogin": 1,
                "name": req.user.name
            }
        }));
    });


app.get('/home', function(req, res) {
    console.log(req.query);
    req.session.isLogin = req.query.isLogin;
    req.session.email = req.query.email;
    req.session.userType = req.query.userType;
    req.session.name = req.query.name;

    return res.redirect('/myhome');



});




app.post('/notify', middleFunctionUser, (req, res) => {


    var userData = req.body.receiverData;
    var storyId = req.body.story;
    var type = req.body.type;

    console.log(req.body);

    var requestObj = {
        fromEmail: req.session.email,
        fromName: req.session.name,
        storyId: req.body.story,
        storyName: req.body.storyName,
        toEmail: userData.email,
        toName: userData.name,
        requestType: type
    }


    members.findOne({
        email: userData.email
    }).then(user => {
        if (user.storyRequests)
            user.storyRequests.push(requestObj)
        else {
            user.storyRequests = [];
            user.storyRequests.push(requestObj)
        }
        user.save().then(user => {
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log(user)
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            res.send("OK");
        })
    })

});




app.post('/likeStory', middleFunctionUser, (req, res) => {


    var liked = req.body.like;
    var storyId = req.body.storyId;
    console.log(req.body);
    stories.findOne({
            _id: storyId
        })
        .then(story => {
            if (liked && (!story.likedBy.includes(req.session.email))) {
                if (story.likedBy)
                    story.likedBy.push(req.session.email)
                else {
                    story.likedBy = [];
                    story.likedBy.push(req.session.email)
                }
            } else {
                if (story.likedBy.includes(req.session.email)) {
                    story.likedBy.remove(req.session.email)
                }
            }


            story.title = story.title;

            story.save().then(story => {
                    console.log(story.likedBy.length)
                    res.send(story.likedBy.length.toString());
                })
                .catch(err => {})

        })




});




app.post('/getUserData', middleFunctionUser, (req, res) => {



    members.findOne({
            email: req.session.email
        })
        .then(member => {

            res.send(member)



        })

});




app.post('/updateStorySettings', middleFunctionUser, (req, res) => {



    var clearLikes = req.body.clearLikes;
    var clearComments = req.body.clearComments;

    console.log(req.body);
    var senderData = {
        name: req.session.name,
        email: req.session.email
    }

    stories.find({})
        .then(allstory => {


            for (var i = 0; i < allstory.length; i++) {
                stories.findOne({
                    _id: allstory[i]._id
                }).then(story => {


                    if (clearLikes && story.likedBy) {
                        const index = story.likedBy.indexOf(req.session.email);
                        if (index > -1)
                            story.likedBy.splice(index, 1);

                    }

                    if (clearComments && story.comments) {
                        for (var i = 0; i < story.comments.length; i++) {
                            const index = story.comments.findIndex(function(comment) {
                                return comment.commentUser.email == req.session.email;
                            });
                            if (index > -1)
                                story.comments.splice(index, 1);
                        }

                    }


                    story.save();

                })
            }


            res.send("OKK")



            //        story.save().then(story=>{
            //        res.send(story)
            //        })
            //        .catch(err=>{})

        })

});




app.delete('/deleteAllMyStories', middleFunctionUser, (req, res) => {


    stories.deleteMany({
            userid: req.session.email
        })
        .then(() => {
            res.send('ok')
        })


});




app.delete('/deleteme', middleFunctionUser, (req, res) => {

    var mailID = req.session.email;




    members.remove({
            email: req.session.email
        })
        .then(() => {
            // stories destroy


            stories.deleteMany({
                userid: mailID
            }).then(() => {
                var clearComments = true;
                var clearLikes = true;
                stories.find({})
                    .then(allstory => {


                        for (var i = 0; i < allstory.length; i++) {
                            stories.findOne({
                                _id: allstory[i]._id
                            }).then(story => {


                                if (clearLikes && story.likedBy) {
                                    const index = story.likedBy.indexOf(mailID);
                                    if (index > -1)
                                        story.likedBy.splice(index, 1);

                                }

                                if (clearComments && story.comments) {
                                    for (var i = 0; i < story.comments.length; i++) {
                                        const index = story.comments.findIndex(function(comment) {
                                            return comment.commentUser.email == mailID;
                                        });
                                        if (index > -1)
                                            story.comments.splice(index, 1);
                                    }

                                }


                                story.save();

                            })
                        }

                        req.session.destroy();


                    })

            })

            //session destroy
            res.send('ok')
        })


});




app.post('/updateUserProfile', middleFunctionUser, (req, res) => {


    var newAbout = req.body.about;
    var newName = req.body.name;
    var toBeCleared = req.body.clear;

    console.log(req.body);
    var senderData = {
        name: req.session.name,
        email: req.session.email
    }

    members.findOne({
            email: req.session.email
        })
        .then(member => {

            if (member.about)
                member.about = newAbout;
            else {
                member.about = "";
                member.about = newAbout;
            }

            member.name = newName;
            if (toBeCleared) {

                for (var i = 0; i < member.following.length; i++) {
                    var user = member.following[i];
                    members.findOne({
                            email: user.email
                        })
                        .then(ruser => {

                            const index = ruser.followers.findIndex(function(person) {
                                return person.email == req.session.email;
                            });
                            if (index > -1) {
                                console.log(index);
                                ruser.followers.splice(index, 1);
                            } else {
                                console.log("T_T T_T T_T T_T T_T")
                            }
                            ruser.save();
                        })
                }

                member.following = [];
            }

            member.save().then(user => {
                    res.send(user)
                })
                .catch(err => {})

        })

});




app.post('/updateAbout', middleFunctionUser, (req, res) => {


    var newAbout = req.body.about;
    members.findOne({
            email: req.session.email
        })
        .then(member => {

            if (member.about)
                member.about = newAbout;
            else {
                member.about = "";
                member.about = newAbout;
            }

            member.save().then(user => {
                    res.send(user)
                })
                .catch(err => {})

        })

});




app.post('/unfollowuser', middleFunctionUser, (req, res) => {

    var receiverData = req.body.receiverData;
    var senderData = {
        name: req.session.name,
        email: req.session.email
    }
    members.findOne({
            email: req.session.email
        })
        .then(member => {




            if (member.following)
                member.following.remove(receiverData)


            member.save().then(member => {

                console.log(member);

                members.findOne({
                        email: receiverData.email
                    })
                    .then(receiver => {


                        if (receiver.followers) {
                            receiver.followers.remove(senderData)

                        }


                        receiver.save().then(user => {

                            //                    console.log("Error to be rectified ")
                            res.send(user.followers);


                        })

                    })

            })

        })


});




app.post('/followuser', middleFunctionUser, (req, res) => {

    var receiverData = req.body.receiverData;
    var senderData = {
        name: req.session.name,
        email: req.session.email
    }
    members.findOne({
            email: req.session.email
        })
        .then(member => {


            if (member.following)
                member.following.push(receiverData)
            else {
                member.following = [];
                member.following.push(receiverData)
            }

            member.save().then(member => {



                members.findOne({
                        email: receiverData.email
                    })
                    .then(receiver => {


                        if (receiver.followers)
                            receiver.followers.push(senderData)
                        else {
                            receiver.followers = [];
                            receiver.followers.push(senderData)
                        }

                        receiver.save().then(user => {
                            console.log(user);
                            res.send(user.followers);


                        })

                    })

            })

        })


});




app.post('/sendingfanmail', middleFunctionUser, (req, res) => {


    var mailOptions = {
        from: 'contact.writingdesk@gmail.com',
        to: req.body.writer,
        subject: req.body.title + "  by - " + req.session.email,
        html: req.body.body
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            res.redirect('/errormail')
        } else {
            console.log('Email sent: ' + info.response);
            res.redirect('/successmail')
        }
    });


});




app.post('/changeStoryRequestType', (req, res) => {

    var type = req.body.type;

    members.findOne({
        email: req.session.email
    }).then(member => {
        for (var i = 0; i < member.storyRequests.length; i++) {
            if (member.storyRequests[i].toEmail == req.body.toEmail && member.storyRequests[i].fromEmail == req.body.fromEmail && member.storyRequests[i].storyId == req.body.storyId && member.storyRequests[i].requestType == 'REQUEST')
                member.storyRequests.splice(i, 1);
        }

        member.save().then(user => {
            res.send("OK")
        })

    })

});




app.post('/mailuser', (req, res) => {


    var mailOptions = {
        from: 'contact.writingdesk@gmail.com',
        to: req.body.email,
        subject: req.body.subject,
        text: req.body.msg
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            res.send("NOT OK")
        } else {
            console.log('Email sent: ' + info.response);
            res.send('OK')
        }
    });

});




app.put('/mail/:id', (req, res) => {
    stories.findOne({
            _id: req.params.id
        })
        .then(story => {

            var mailOptions = {
                from: 'contact.writingdesk@gmail.com',
                to: req.body.email,
                subject: req.body.subject,
                html: story.body
            };

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                    res.redirect('/errormail')
                } else {
                    console.log('Email sent: ' + info.response);
                    res.redirect('/successmail')
                }
            });


        });
});



// Stories Index my stories
app.get('/stories/my', (req, res) => {
    stories.find({
            userid: req.session.email
        })
        .then(story => {

            res.render('stories/my', {
                stories: story,
                user: req.session.name,
                useremail: req.session.email

            })

        });
});



// Stories Index Specific user
app.get('/stories/user/:id', (req, res) => {
    stories.find({
            userid: req.params.id
        })
        .then(story => {

            res.render('stories/user', {
                stories: story,
                user: req.session.name,

            })

        });
});

app.post('/stories/comment/:id', (req, res) => {
    console.log(req.params.id);

    members.find({
            email: req.session.email
        })
        .then(data => {
            //console.log(data);

            stories.findOneAndUpdate({
                    _id: req.params.id
                }, {
                    $push: {
                        comments: {
                            commentBody: req.body.commentBody,
                            commentUser: data[0],
                            commentDate: Date.now()
                        }
                    }
                })
                .then((data) => {
                    console.log(data);
                    res.redirect('/stories/show/' + req.params.id);
                })
        })

})




// Stories Index
app.get('/stories', (req, res) => {
    stories.find({
            status: 'public'
        })
        .populate('user')
        .then(story => {

            res.render('stories/index', {
                stories: story,
                user: req.session.name,
                useremail: req.session.email

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
                user: req.session.name,
                moment: moment,
                useremail: req.session.email,
            });
        });
});



app.get('/gotoUserpage/:email', middleFunctionUser, (req, res) => {
    members.findOne({
            email: req.params.email
        })
        .then(member => {
            res.redirect('/userpage/' + member._id)
        });
});



app.get('/userpage/:id', middleFunctionUser, (req, res) => {
    members.findOne({
            _id: req.params.id
        })
        .then(member => {

            if (member.email == req.session.email)
                res.redirect('/me');
            else {


                stories.find({
                    userid: member.email
                }).then(story => {
                    res.render('userpage', {
                        userDetails: member,
                        user: req.session.name,
                        userStories: story,
                        moment: moment,
                        useremail: req.session.email,
                    });

                })


            }
        });
});




app.get('/dashboard', middleFunctionUser, (req, res) => {
    stories.find({
            userid: req.session.email
        })
        .then(userStories => {
            res.render('dashboard', {
                stories: userStories,
                user: req.session.name,
                moment: moment,
                username: req.session.name
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
                user: req.session.name,
                moment: moment
            });
        });
});



app.put('/stories/:id', (req, res) => {
    stories.findOne({
            _id: req.params.id
        })
        .then(story => {

            var str_keywords = req.body.keywords;
            var arr = str_keywords.split(",");
            var allow;
            if (req.body.allowComments)
                allow = true;
            else
                allow = false;

            //set new values
            story.title = req.body.title;
            story.body = req.body.body;
            story.keywords = arr;
            story.status = req.body.status;
            story.allowComments = allow;


            story.save()
                .then(story => {
                    res.redirect('/dashboard')
                })

        });
});



app.delete('/stories/:id', (req, res) => {
    stories.remove({
            _id: req.params.id
        })
        .then(() => {
            res.redirect('/dashboard')
        })
});




app.post('/addingstory', (req, res) => {

    var allow;
    if (req.body.allowComments)
        allow = true;
    else
        allow = false;

    var str_keywords = req.body.keywords;
    var arr = str_keywords.split(",");

    members.findOne({
            email: req.session.email
        })
        .then(storyAuthor => {


            const st = {
                title: req.body.title,
                status: req.body.status,
                body: req.body.body,
                date: Date.now(),
                keywords: arr,
                likedBy: [],
                author: storyAuthor,
                allowComments: allow,
                username: req.session.name,
                userid: req.session.email
            }

            new stories(st).save()
                .then(story => {
                    console.log(story);

                    sendmsg(story.title+" Has Been Added By "+story.author.name+".");
                    res.redirect('/dashboard')

                })



        })




})

app.get('/settings', middleFunctionUser, (req, res) => {

    members.findOne({
        email: req.session.email
    }).then(member => {

        console.log(member)
        res.render('settings', {
            user: req.session.name,
            userDetails: member
        });

    })


})




app.get('/error', (req, res) => {
    res.render('error', {
        user: req.session.name,
        message: "Error ! page"
    });
})


app.get('/errormail', (req, res) => {
    res.render('error', {
        user: req.session.name,
        message: "Error! sending mail"
    });
})
app.get('/successmail', (req, res) => {
    res.render('error', {
        user: req.session.name,
        message: "Success ! Mail has been sent"
    });
})


app.get('/mailwriter', middleFunctionUser, (req, res) => {

    members.find({})
        .then(member => {

            res.render('mailwriter', {
                author: member,
                user: req.session.name,
                useremail: req.session.email,
            });
        });

});


app.get('/about', (req, res) => {
    res.render('about', {
        user: req.session.name
    });
})
app.get('/likedStories', middleFunctionUser, (req, res) => {
    stories.find({

            likedBy: req.session.email
        })
        .then(story => {

            res.render('likedStories', {
                stories: story,
                user: req.session.name,
                useremail: req.session.email

            })

        });
})

app.get('/add', middleFunctionUser, (req, res) => {
    res.render('addstories', {
        user: req.session.name
    });
})

app.get('/search', middleFunctionUser, (req, res) => {

    stories.find({})
        .then(story => {

            res.render('search', {
                stories: story,
                userDetails: story[0].author,
                user: req.session.name,
                useremail: req.session.email

            })

        });

})




app.post('/getUserStories', (req, res) => {


    var email = req.body.useremail;


    stories.find({
            userid: email
        })
        .then(story => {

            res.send(story)
        })




});




app.post('/getStoriesForMe', (req, res) => {


    var type = req.body.storyType;

    if (type == 'LIKED') {
        stories.find({
                likedBy: req.session.email
            })
            .then(story => {
                console.log(story)
                res.send(story)
            })
    } else {
        stories.find({
                userid: req.session.email
            })
            .then(story => {
                console.log(story)
                res.send(story)
            })
    }




});

app.post('/searchQuery', (req, res) => {


    var search = req.body.search;
    var findobj = {};
    if (search != '')
        findobj["$or"] = [{
            "title": {
                $regex: ".*" + search + ".*"
            }
        }, {
            "keywords": {
                $regex: ".*" + search + ".*"
            }
        }, {
            "username": {
                $regex: ".*" + search + ".*"
            }
        }]
    else {
        delete findobj["$or"];
    }
    stories.find(findobj)
        .then(story => {
            console.log("--------------------===---------------------------===--------------------===--->>>")
            console.log(story)
            res.send(story)
        })




});




app.post('/userRelations', (req, res) => {

    var search = req.body.receiverData;

    members.findOne({
            email: req.session.email
        })
        .then(member => {
            console.log(member.following)
            console.log(search)
            var isFollowing = 0;
            for (var i = 0; i < member.following.length; i++) {
                console.log("-----")
                if (JSON.stringify(member.following[i]) === JSON.stringify(search)) {
                    isFollowing = 1;
                    break;
                }
            }
            if (isFollowing === 1)
                res.send("IS_FOLLOWING")
            else {
                res.send("NOT_FOLLOWING")
            }
        })




});




app.post('/searchWriterName', (req, res) => {


    var search = req.body.search;
    var findobj = {};
    if (search != '')
        findobj["$or"] = [{
            "name": {
                $regex: ".*" + search + ".*"
            }
        }, {
            "email": {
                $regex: ".*" + search + ".*"
            }
        }]
    else {
        delete findobj["$or"];
    }
    members.find(findobj)
        .then(member => {
            res.send(member)
        })




});




app.get('/me', middleFunctionUser, (req, res) => {
    stories.find({
            userid: req.session.email
        })
        .then(story => {


            members.findOne({
                    email: req.session.email
                })
                .then(member => {
                    res.render('me', {
                        stories: story,
                        userDetails: member,
                        user: req.session.name,
                        useremail: req.session.email

                    })

                })




        });


});




app.get('/news', middleFunctionUser, (req, res) => {
    res.render('news', {
        user: req.session.name
    });
})


app.get('/searchWriter', middleFunctionUser, (req, res) => {
    res.render('searchWriter', {
        user: req.session.name
    });
})


app.get('/myhome', middleFunctionUser, (req, res) => {


    stories.find({}).then(story => {


        members.findOne({
            email: req.session.email
        }).then(member => {
            res.render('home', {
                userDetails: member,
                user: req.session.name,
                useremail: req.session.email,
                stories: story
            });


        })




    })

})




app.get('/analysis', middleFunctionUser, (req, res) => {


    stories.find({
        userid: req.session.email
    }).then(story => {

        members.findOne({
            email: req.session.email
        }).then(user => {

            res.render('analysis', {
                user: req.session.name,
                userDetails: user,
                stories: story,
                moment: moment,
            });
        })


    })


})




app.get('/explore', middleFunctionUser, (req, res) => {




    members.find({}).then(user => {

        res.render('explore', {
            user: req.session.name,
            users: user,
        });
    })




})




app.get('/storyRequests', middleFunctionUser, (req, res) => {




    members.findOne({
        email: req.session.email
    }).then(user => {

        res.render('notifications', {
            user: req.session.name,
            users: user,
        });
    })




})




app.get('/liveChatBox', middleFunctionUser, (req, res) => {
    members.findOne({
        email: req.session.email
    }).then(user => {

        res.render('liveChatBox', {
            user: req.session.name,
            userDetails: user
        });
    })

})




app.get('/auth/logout', (req, res) => {
    req.session.destroy();


    res.redirect('/');
})


app.get('/verify', (req, res) => {

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


function sendmsg(data)
{
var message = {
    app_id: "4a426ee2-1255-494f-929c-67bf4ef82e13",
    contents: {
        "en": data
    },
    included_segments: ["All"]
};

sendNotification(message);
}




//app.listen(port);


// id:68669218963-mi3a3rv0tlb3j1mb99s2dn9gfd7pnc2l.apps.googleusercontent.com
// secret:rM2tIQo4jFMGY5e-Cq60rCwF