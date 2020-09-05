var express=require("express")
var mo=require("method-override")
var app=express();
var passport=require("passport");
var LocalStrategy=require("passport-local");
var bp=require("body-parser");
var es=require("express-sanitizer");
var mongoose=require("mongoose");
var passportlocalmongoose=require("passport-local-mongoose");
var methodoverride=require("method-override");
var flash=require("connect-flash");



app.use(bp.urlencoded({extended:true}));
app.use(es());
// mongoose.connect("mongodb://localhost:27017/yelp_camp",{useNewUrlParser:true});
mongoose.connect("<<your_mongo_url>>",{
	useNewUrlParser: true,
	useCreateIndex: true
}).then(() =>{
	console.log("Connected to DB");
}).catch(errr =>{
	console.log("Error",err.message);
});


app.use(methodoverride("_method"));

var UserSchema=new mongoose.Schema({
	username:String,
	passport:String
});
UserSchema.plugin(passportlocalmongoose);
var user=mongoose.model("user",UserSchema);

var commentSchema=mongoose.Schema({
	text:String,
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:"user"
		},
		username:String
	}
});

var comment=mongoose.model("comment",commentSchema);

var campgroundSchema=new mongoose.Schema({
	name:String,
	images:String,
	data:String,
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:"user"
			},
			username:String
},
	comments:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"comment"
		}
	]
});

var Campground=mongoose.model("Campground",campgroundSchema);




// var camp=[{name:"himashal",images:"https://images.unsplash.com/photo-1471115853179-bb1d604434e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60"},
// 		 {name:"kulu",images:"https://images.unsplash.com/photo-1500581276021-a4bbcd0050c5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60"},
// 		 {name:"kanyakumari",images:"https://images.unsplash.com/photo-1496080174650-637e3f22fa03?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60"}];

app.use(express.static("public"));
app.set("view engine","ejs"); //use this to remove .ejs extension from res.render
app.use(mo("_method"));
app.use(flash());



app.use(require("express-session")({
	secret:"gg",
	resave:false,
	saveUninitialized:false
	
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser=req.user;
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});

app.get("/",function(req,res){
	res.render("home");
});

app.get("/qq/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments").exec(function(err,allCampground){
		if(err){
			console.log(err);
		}else{
			// console.log(allCampground);
			res.render("qq",{camp:allCampground});
		}
	});
})

app.get("/campground",function(req,res){
	// res.render("campground",{camp:camp});con
	// console.log(req.user);
	Campground.find({},function(err,allCampground){
		if(err){
			console.log(err);
		}else{
			res.render("campground",{camp:allCampground,currentUser:req.user});
		}
	})
});


app.post("/campground",function(req,res){
	// console.log(camps[data]);
	// req.body.name.body=req.sanitize(req.body.camps.body)
	// req.body.images.body=req.sanitize(req.body.camps.body)
	// req.body.data.body=req.sanitize(req.body.camps.body)
	var name=req.body.name;
	var images=req.body.images;
	var data=req.body.data;
	var author={
		id:req.user._id, 
		username:req.user.username
	}
	var newcamp={name:name,images:images,data:data,author:author};
	// camp.push(newcamp);
	// res.redirect("campground");
	Campground.create(newcamp, function(err,newlyCreated){
		if(err){
			console.log(err);
		}else{
			// console.log(newlyCreated);
			req.flash("success","campground added successfully")
			res.redirect("/campground");
		}
	});
});

app.get("/newcamp",isLoggedIn,function(req,res){
	res.render("newcamp");
});

app.get("/campground/register",function(req,res){
	res.render("register");
});

app.post("/campground/register",function(req,res){
	var newuser=new user({username:req.body.username});
	user.register(newuser,req.body.password,function(err,user){
		if(err){
			console.log(err);
			req.flash("error",err.message);
			return res.render("register");
		}else{
			passport.authenticate("local")(req,res,function(){
				res.redirect("/campground");
			});
		}
	});	
});

app.get("/campground/login",function(req,res){
	res.render("login");
});

app.post("/campground/login",passport.authenticate("local",
    {
	successRedirect:"/campground",
	failureRedirect:"/campground/login"
}),function(req,res){
	
});

app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/campground");
})

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}else{
		req.flash("error","login first");
		res.redirect("back");
	}
}

app.get("/campground/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments").exec(function(err,allCampground){
		if(err){
			console.log(err);
		}else{
			// console.log(allCampground);
			res.render("show",{camp:allCampground});
		}
	});
});

app.get("/campground/:id/edit",checkownership,function(req,res){
	Campground.findById(req.params.id,function(err,found){
		res.render("edit",{camp:found});
		
	});
});

app.put("/campground/:id",function(req,res){
	req.body.camps.body=req.sanitize(req.body.camps.body)
	Campground.findByIdAndUpdate(req.params.id,req.body.camps,function(err,ub){
		if(err){
			res.render("/campground");
		}else{
			res.redirect("/campground/"+req.params.id);
		}
	});
});

app.delete("/campground/:id",function(req,res){
	Campground.findByIdAndRemove(req.params.id,function(err){
		if(err){
			res.redirect("/campground");

		}else{
			res.redirect("/campground");
		}
	});
});

app.get("/campground/:id/comments/new",isLoggedIn, function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err){
			console.log(err);
		}else{
			// console.log(campground);
			res.render("comment",{camp:campground});
		}
	});
});

app.post("/campground/:id/comments",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err){
			console.log(err);
			res.redirect("/campground");
		}else{
			
			// console.log(req.body.comment);
			var com=req.body.text;
			var aut=req.body.author;
			
			var c={text:com,author:aut};
			// console.log(c);
			comment.create(c,function(err,com){
				if(err){
					console.log(err);
				}else{
					com.author.id=req.user._id;
					com.author.username=req.user.username;
					// console.log(com);
					// res.send("hello");
					com.save();
					campground.comments.push(com);
					campground.save();
					res.redirect("/campground/"+campground._id);
				}
			});
		}
	});
});

app.get("/campground/:id/comments/:com_id",checkcomownership,function(req,res){
	comment.findById(req.params.com_id,function(err,fc){
		if(err){
			res.redirect("back");
		}else{
			res.render("com_edit",{camp_id:req.params.id,comment:fc});
		}
	});
});

app.put("/campground/:id/comments/:com_id",function(req,res){
	// res.send("h");
	comment.findByIdAndUpdate(req.params.com_id,req.body.comment,function(err,uc){
		if(err){
			res.redirect("back");
		}else{
			res.redirect("/campground/"+req.params.id);
		}
	});
});

app.delete("/campground/:id/comments/:com_id",function(req,res){
	// res.send("ff");
	comment.findByIdAndRemove(req.params.com_id,function(err){
		if(err){
			res.redirect("back");
		}else{
			res.redirect("/campground/"+req.params.id);
		}
	});
});


function checkownership(req,res,next){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id,function(err,f){
			if(err){
				res.redirect("back");
			}else{
				// console.log("===");
				// console.log(req.user._id);
				
				// console.log("====");
				// console.log(f.author.id);
				// console.log("=====");
				if(f.author.id.equals(req.user._id)){
					next();
				}else{
					res.redirect("back");
				}
			}
		});
	}else{
		res.redirect("back");
	}
}

function checkcomownership(req,res,next){
	if(req.isAuthenticated()){
		comment.findById(req.params.comment_id,function(err,fc){
			if(err){
				res.redirect("back");
			}else{
				// console.log("===");
				// console.log(req.user._id);
				
				// console.log("====");
				// console.log(fc.author.id);
				// console.log("=====");
				if(fc.author.id.equals(req.user._id)){
					next();
				}else{
					res.redirect("back");
				}
			}
		});
	}else{
		res.redirect("back");
	}
}


// app.listen(3000,()=>{
// 		   console.log('YelpCamp Server started');
// });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our yelpcamp is running on port ${ PORT }`);
});







