// const express = require('express');
// const app = express();
// app.get('/',(req,res) => {
//     res.send('Hello World');
// });

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { type } = require('os');
var bodyParser = require('body-parser')
const { json } = require('body-parser');
const { runInContext } = require('vm');
const { time, error } = require('console');
const app = express();
app.use(express.static("public"))
app.set('view engine','ejs')
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }));

//code to connect to mongodb
mongoose.connect("mongodb+srv://new_user:amazondb@cluster0.nbvgh9f.mongodb.net/amazon?retryWrites=true&w=majority&appName=Cluster0",
    {useNewUrlParser: true,
        useUnifiedTopology: true}
).then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

//structure for user schema
const userSchema = new mongoose.Schema({
    username:{type:String, required:true,unique:true},
    password:{type:String, required:true},
    weight:{type:Number, default:70},
    location:{
        latitude:{
            type: Number,
            required: true,
            validate: {
                validator: (v) => v >= -90 && v <= 90, // Ensures latitude is within valid range
                message: 'Latitude must be between -90 and 90'
            }
        },
        longitude:{
            type: Number,
            required: true,
            validate: {
                validator: (v) => v >= -180 && v <= 180, // Ensures longitude is within valid range
                message: 'Longitude must be between -180 and 180'
            }
        }
    },
    ecoPoints:{type:Number},
    carbonSaved:{type:Number},
    caloriesBurned:{type:Number}
  
});

// userSchema.pre('save',async function(next){
//     if (this.isModified('password')){
//         this.password = await bcrypt.hash(this.password, 10);
//     }
//     next();
// });

const User = mongoose.model('User',userSchema);
module.exports = User;

//structure for pickup points that needs to be defined in db
const pickupPointSchema = new mongoose.Schema({
    name: {type:String, required:true},
    latitude: {type:Number, required:true},
    longitude:{type:Number,required:true},
    address:{type:String,required:true}
});
const PickupPoint = mongoose.model('PickupPoint',pickupPointSchema);
module.exports = PickupPoint;



const ecostatschema = new mongoose.Schema({
    user: { type: ObjectId, ref: 'User', required: true },
    ecoPoints: {type:Number},
    carbonSaved: {type:Number},
    caloriesBurned: {type:Number},
    timestamp: { type: Date, default: Date.now }
  });
  const EcoStat = mongoose.model('EcoStat',ecostatschema);
  module.exports = EcoStat;

  const deliverySchema = new mongoose.Schema({
    productname: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    delivery_date: { type: Date, required: true, default: Date.now },
    time_slot: { type: String, required: true }, 
    mode_of_transport: { type: String, required: true },
    pickup_address: { type: String, required: true },
    delivery_address: { type: String, required: true },
    recieve_time: { type: Date }, 
    delivery_status: { type: String, default: "pending", enum: ["pending", "in-transit", "delivered", "canceled","failed"] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ecoPoints: { type: Number },
}, { timestamps: true });
const Delivery = mongoose.model('Delivery',deliverySchema);
module.exports = Delivery;

//api to register user to db
app.post('/register',async (req,res) => {
    const {username, password,weight,latitude,longitude} = req.body;
    try{
        const user = new User({
            username,
            password,
            weight,
            location:{latitude,longitude},
            ecoPoints:0,
            carbonSaved:0,
            caloriesBurned:0
        });
        await user.save();
        res.status(201).send('User registered successfully');

    }catch(error){
        res.status(400).send('Registration failed');
    }
});

//api to add pickup point to db
app.post('/addpickup',async (req,res) => {
    const {name,latitude,longitude,address} = req.body;
    try{
        const addpickup = new PickupPoint({
            name,
            latitude,
            longitude,
            address
        });
        await addpickup.save();
        res.status(201).send('User registered successfully');

    }catch(error){
        res.status(400).send('Registration failed');
    }
});

//api to login user along with token to db
app.post('/login',async (req,res) =>{
    const {username, password} = req.body;
    try{
        const user = await User.findOne({username});
        if (user && (await bcrypt.compare(password, user.password))){
            const token = jwt.sign({userId : user._id}, 'yourSecretKey',{expiresIn:'1h'});
            res.json({token});
        }
        else{
            res.status(400).send('Invalid credentials');
        }
    }catch(error){
        res.status(500).send('Login failed');
    }
});

//this is used to update the total ecopoints, carbonsaved and caloriesburned in the user schema
app.post('/user/update', async (req, res) => {
    const { userid, ecoPoints, carbonSaved, caloriesBurned } = req.body;

    try {
        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).send('The user with the given ID was not found.');
        }
        const updatedEcoPoints = (user.ecoPoints || 0) + (ecoPoints || 0);
        const updatedCarbonSaved = (user.carbonSaved || 0) + (carbonSaved || 0);
        const updatedCaloriesBurned = (user.caloriesBurned || 0) + (caloriesBurned || 0);
        
        const updatedUser = await User.findByIdAndUpdate(
            userid,
            {
                ecoPoints: updatedEcoPoints,
                carbonSaved: updatedCarbonSaved,
                caloriesBurned: updatedCaloriesBurned,
            },
            { new: true }
        );
        res.status(200).send(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong.');
    }
});

//api to add new delivery data to the db schema
app.post('/add/delivery',async (req,res) => {
    const {userId, ecoPoints,carbonSaved,caloriesBurned} = req.body;
    try{
        if (!userId || !ecoPoints || !carbonSaved || !caloriesBurned){
            return res.status(400).send({error:"All fields are required"});
        }
        const newEntry = new EcoStat({
            userId,
            ecoPoints,
            carbonSaved,
            caloriesBurned
        });
        await newEntry.save();
        res.status(201).send('EcoStat logged successfully');

    }catch(error){
        console.error(error);
        res.status(400).send('Server error while logging EcoStat');
    }
});

//api to get all delivery eco points and metrics
app.get('/deliveries/:userId', async (req, res) => {
    try {
        const userId = req.params;
        const deliveries = await EcoStat.find({user:userId}).populate('user');
        // Return the delivery list
        res.status(200).send({ message: "Delivery details fetched successfully", data: deliveries });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error while fetching deliveries" });
    }
});

//api to get the profile data
app.get('/getprofile/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const profile = await User.find({id:id});
        // Return the delivery list
        res.status(200).send({ message: "Profile data fetched successfully", data: profile });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error while fetching profile data" });
    }
});

app.post('/delivery', async (req, res) => {
    const {
        productname,
        price,
        quantity,
        delivery_date,
        time_slot,
        mode_of_transport,
        pickup_address,
        delivery_address,
        user
    } = req.body;

    try {
        const delivery = new Delivery({
            productname,
            price,
            quantity,
            delivery_date,
            time_slot,
            mode_of_transport,
            pickup_address,
            delivery_address,
            user
        });
        const savedDelivery = await delivery.save();

        res.status(201).send({
            message: "Delivery scheduled successfully",
            data: savedDelivery
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to schedule delivery" });
    }
});

//api to update the delivery status
router.put('/delivery/:id', async (req, res) => {
    const { id } = req.params;
    const { delivery_status, recieve_time } = req.body;

    try {
        const updatedDelivery = await Delivery.findByIdAndUpdate(
            id,
            {
                delivery_status,
                recieve_time
            },
            { new: true }
        );

        if (!updatedDelivery) {
            return res.status(404).send({ message: "Delivery not found" });
        }
        res.status(200).send({
            message: "Delivery updated successfully",
            data: updatedDelivery
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to update delivery" });
    }
});



//this is to add authentication using token
const auth = (req,res,next) => {
    const token = req.header('Authorization').replace('Bearer','');
    try{
        const decoded = jwt.verify(token,'yourSecretKey');
        req.userId = decoded.userId;
        next();
    }catch (error){
        res.status(401).send('Unauthorized');
    }
};

//this is to calculate distance between two points( including latitude & longitude )
//Haversine formula - first convert degree to radian then put in formula
function calculateDistance(lat1,lon1,lat2,lon2){
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

function calculateMetrics(distance,mode,weight){
    const emissions = {"car":0.21,"ev":0.05,"cycling":0.0,'walking':0.0};
    const met_values = {"walking":3.5,"cycling":8.0,"ev":1.8,"car":1.5};
    const speeds = {"walking":5,"cycling":14,"ev":30,"car":40,"bike":30};
    
    const baseline_emission = emissions["car"] * distance;
    const mode_emission = emissions[mode] * distance;
    const carbon_saved = baseline_emission - mode_emission;
    time = distance / speeds[mode];

    let calories_burned = 0;
    calories_burned_per_minute = met_values * 3.5 * weight / 200;
    calories_burned = calories_burned_per_minute * time * 60; //in minutes

    return {
        carbon_saved: round(carbon_saved,2),
        calories_burned: round(calories_burned,2),
    };
}

function round(num,precision=2){
    return parseFloat(num.toFixed(precision));
}

app.get('/getmetrics',auth,async (req,res) => {
    const {userDistance,userMode,userWeight} = req.body;
    
    const metrics_cal = calculateMetrics(userDistance,userMode,userWeight);
    res.json(metrics_cal);
});

//logic to calculate nearby pickuppoints based on given user location
app.get('/nearby-pickups/:lat/:lon',auth,async (req,res) => {
    // const user = await User.findById(req.userId);
    // const userLat = user.location.latitude;
    // const userLon = user.location.longitude;
    const userLat = req.params.lat;
    const userLon = req.params.lon;

    //logic to get all the nearby pickup points...we will calculate distance between
    //the given two points and if it is <= 10 then it will returned in db format along with distance
    const pickupPoints = await PickupPoint.find();
    const nearbyPoints = pickupPoints.map(point => {
        const distance = calculateDistance(userLat,userLon,point.latitude,point.longitude);
        return {...point._doc,distance};
    }).filter(point => point.distance <= 10);
    res.json(nearbyPoints);
});


// Leaderboard API
app.get('/leaderboard', async (req, res) => {
    const userId = req.query.userId;

    try {
        // Fetch all users sorted by ecoPoints (descending order)
        const users = await User.find().sort({ ecoPoints: -1 }).exec();
        
        // Find the user's position in the leaderboard
        const user = users.find(u => u._id.toString() === userId);

        if (!userId || !user) {
            const leaderboard = users.slice(0, 10).map((user, index) => ({
                position: index + 1,
                username: user.username,
                ecoPoints: user.ecoPoints,
                carbonSaved: user.carbonSaved,
                caloriesBurned: user.caloriesBurned,
            }));

            return res.status(200).json({ leaderboard });
        }

        const top3 = users.slice(0, 3).map((user, index) => ({
            position: index + 1,
            username: user.username,
            ecoPoints: user.ecoPoints,
            carbonSaved: user.carbonSaved,
            caloriesBurned: user.caloriesBurned,
        }));

        const userPosition = users.indexOf(user) + 1;
        const userDetails = {
            position: userPosition,
            username: user.username,
            ecoPoints: user.ecoPoints,
            carbonSaved: user.carbonSaved,
            caloriesBurned: user.caloriesBurned
        };

        return res.status(200).json({
            top3Users: top3, 
            userDetails
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching leaderboard');
    }
});


// app.post('/delivery-metrics',auth,async (req,res) => {
    // const {distance,mode} = req.body;
    // const user = await User.findById(req.userId);
//     if (!user) return res.status(404).json({message:'User not found'});
//     const metrics = calculateMetrics(distance,mode,user.weight);
//     res.json(metrics);
// });

// app.post('/schedule-delivery',auth,async (req,res) => {
//     const {pickPointId,mode} = req.body;
//     const user = await User.findById(req.userId);
//     const pickupPoint = await PickupPoint.findById(pickPointId);

//     const distance = calculateDistance(
//         user.location.latitude,
//         user.location.longitude,
//         pickupPoint.latitude,
//         pickupPoint.longitude
//     );
//     const metrics = calculateMetrics(distance, mode, user.weight);
//     res.json({
//         message:'Delivered schedule successfully',
//         pickupPoint,
//         mode,
//         metrics
//     });
// });

const port = 3000;
app.listen(port, () => {
    console.log("Server listening on port");
});