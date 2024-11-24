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
const { ObjectId } = mongoose.Schema.Types;
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }));

//code to connect to mongodb
mongoose.connect("mongodb+srv://sonu:sonu@cluster0.1uhvk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
    ssl:true}
).then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

//structure for user schema
const userSchema = new mongoose.Schema({
    username:{type:String, required:true,unique:true},
    password:{type:String, required:true},
    weight:{type:Number, default:70},
        latitude:{
            type: Number,
            required: true,
            // validate: {
            //     validator: (v) => v >= -90 && v <= 90, // Ensures latitude is within valid range
            //     message: 'Latitude must be between -90 and 90'
            // }
        },
        longitude:{
            type: Number,
            required: true,
            // validate: {
            //     validator: (v) => v >= -180 && v <= 180, // Ensures longitude is within valid range
            //     message: 'Longitude must be between -180 and 180'
            // }
        }
    ,
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

  const productschema = new mongoose.Schema({
    name: { type:String ,required:true},
    price: {type:Number, required:true},
    desc: {type:String,required:true},
    image: { type:String,required:true }
  });
  const Product = mongoose.model('Product',productschema);
  module.exports = Product;

  const deliverySchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity:{type:Number,required:true},
    delivery_date: { type: String, required: true, default: Date.now },
    time_slot: { type: String, required: true }, 
    mode_of_transport: { type: String, required: true },
    delivery_address: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupPoint', required: true },
    recieve_time: { type: String ,default:""}, 
    delivery_status: { type: String, default: "pending", enum: ["pending", "in-transit", "delivered", "canceled","failed"] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ecoPoints: { type: Number,default:0},
    carbonSaved: { type: Number,default:0},
    caloriesBurned: { type: Number,default:0},
}, { timestamps: true });
const Delivery = mongoose.model('Delivery',deliverySchema);
module.exports = Delivery;


app.get('/',async (req,res) => {
    return res.json("Hello");
});

//api to register user to db
app.post('/register', async (req, res) => {
    const { username, password, weight, latitude, longitude } = req.body;

    try {
        // Create a new user instance
        const user = new User({
            username,
            password,
            weight,
            latitude,
            longitude,
            ecoPoints:0,
            carbonSaved:0,
            caloriesBurned:0
        });

        // Save the user to the database
        const savedUser = await user.save();

        // Send back the saved user details including the ID
        res.status(201).json({
            message: 'User registered successfully',
            user: savedUser
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            message: 'Registration failed',
            error: error.message
        });
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

app.post('/addproduct',async (req,res) => {
    const {name,price,desc,image} = req.body;
    try{
        const addproduct = new Product({
            name,
            price,
            desc,
            image
        });
        await addproduct.save();
        res.status(201).send('Product added successfully');

    }catch(error){
        res.status(400).send('Product failed');
    }
});

app.get('/products',async (req, res) => {
    try {
        // Fetch all products from the database
        const products = await Product.find();

        // Send back the list of products
        res.status(200).json({
            message: 'Products retrieved successfully',
            products: products
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Failed to retrieve products',
            error: error.message
        });
    }
});




    app.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
    
            if (!username || !password) {
                return res.status(400).send("Username and password are required");
            }
    
            // Find the user in the database
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(400).send("Invalid credentials");
            }
    
            // Compare passwords directly
            if (user.password !== password) {
                return res.status(400).send("Invalid credentials");
            }
    
            // Generate a token upon successful login
            const token = jwt.sign({ userId: user._id }, 'yourSecretKey', { expiresIn: '1h' });
            res.json({ token });
        } catch (error) {
            console.error("Login Error:", error);
            res.status(500).send("Login failed");
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
        const { userId } = req.params; // Extract the userId directly
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send({ error: "Invalid userId format" });
        }

        const deliveries = await Delivery.find({ user: userId }).populate('user').populate('product').populate('delivery_address');
        
        // Return the delivery list
        res.status(200).send({ 
            message: "Delivery details fetched successfully", 
            data: deliveries 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error while fetching deliveries" });
    }
});


//api to get the profile data
app.get('/getprofile/:id', async (req, res) => {
    const id = req.params.id; // Access the 'id' directly from req.params
    try {
        const profile = await User.find({ _id: id }); // Use the 'id' directly here
        // Return the profile data
        res.status(200).send({ message: "Profile data fetched successfully", data: profile });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Server error while fetching profile data" });
    }
});


app.post('/delivery', async (req, res) => {
    const {
        product,
        quantity,
        delivery_date,
        time_slot,
        mode_of_transport,
        delivery_address,
        user
    } = req.body;

    try {
        const delivery = new Delivery({
            product,
            quantity,
            delivery_date,
            time_slot,
            mode_of_transport,
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
app.put('/delivery/:id', async (req, res) => {
    const { id } = req.params;
    const { delivery_status, recieve_time,ecoPoints,carbonSaved,caloriesBurned,mode_of_transport } = req.body;

    try {
        const updatedDelivery = await Delivery.findByIdAndUpdate(
            id,
            {
                delivery_status,
                recieve_time,
                ecoPoints,
                carbonSaved,
                caloriesBurned,
                mode_of_transport 
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
function calculateEcoPoints(carbonSaved, caloriesBurned, distance, mode) {
    const weights = {
        carbon: 2,
        calorie: 0.5,
        distance: 1
    };

    const modeBasePoints = {
        "Running": 18,
        "Walking": 15,
        "On Bicycle": 12,
        "In Vehicle": 0,
    };

    // Calculate raw eco-points
    const rawEcoPoints = (carbonSaved * weights.carbon) +
                         (caloriesBurned * weights.calorie) +
                         (distance * weights.distance) +
                         modeBasePoints[mode];

    // Scale down eco-points
    const scalingFactor = 10; // Adjust this as necessary
    const ecoPoints = rawEcoPoints / scalingFactor;

    return Math.round(ecoPoints); // Return rounded eco-points
}

function calculateMetrics(distance, mode, weight) {
    const emissions = { "In Vehicle": 0.21, "Running": 0.0, "On Bicycle": 0.0, "Walking": 0.0};
    const met_values = { "Walking": 3.5, "On Bicycle": 8.0, "Running": 9.8, "In Vehicle": 1.5};
    const speeds = { "Walking": 5, "On Bicycle": 14, "Running": 10, "In Vehicle": 40};

    const baseline_emission = emissions["In Vehicle"] * distance;
    const mode_emission = emissions[mode] * distance;
    let carbon_saved = baseline_emission - mode_emission;
    const time = distance / speeds[mode];

    let calories_burned = 0;
    const calories_burned_per_minute = met_values[mode] * 3.5 * weight / 200;
    calories_burned = calories_burned_per_minute * time * 60; // in minutes

    carbon_saved = round(carbon_saved, 2);
    calories_burned = round(calories_burned, 2);
    const ecoPoints = calculateEcoPoints(carbon_saved, calories_burned, distance, mode);

    return {
        mode,
        carbon_saved,
        calories_burned,
        ecoPoints
    };
}

function round(num, precision = 2) {
    return parseFloat(num.toFixed(precision));
}

app.get('/getmetrics', async (req, res) => {
    const userDistance = req.query.userDistance;
    const userWeight = req.query.userWeight;


    if (!userDistance || !userWeight) {
        return res.status(400).json({ error: 'Distance and weight are required!' });
    }

    // List of transportation modes
    const modes = ['Walking', 'Running', 'In Vehicle', 'On Bicycle'];

    // Calculate metrics for all modes
    const metrics = modes.map(mode => calculateMetrics(userDistance, mode, userWeight));

    res.json(metrics);
});

app.get('/solo/getmetrics', async (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    const lat1 = req.query.lat1;
    const lon1 = req.query.lon1;
    const userWeight = req.query.userWeight;
    const mode_of_transport = req.query.mode_of_transport;
    const distance = calculateDistance(lat,lon,lat1,lon1);

    if (!lat || !lon || !lat1 || !lon1 || !userWeight || !mode_of_transport) {
        return res.status(400).json({ error: 'Distance and weight are required!' });
    }

    // List of transportation modes


    var metrics = calculateMetrics(distance,mode_of_transport,userWeight);
    metrics = {...metrics,distance}
    // Calculate metrics for all modes
    res.json(metrics);
});


//logic to calculate nearby pickuppoints based on given user location
app.get('/nearby-pickups/:lat/:lon', async (req, res) => {
    const { lat, lon } = req.params;

    // Convert lat and lon to numbers (in case they are passed as strings)
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    // Fetch all pickup points from the database
    const pickupPoints = await PickupPoint.find();

    // Calculate distance for each point and filter based on distance <= 10 km
    const nearbyPoints = pickupPoints.map(point => {
        const distance = Math.round(calculateDistance(userLat, userLon, point.latitude, point.longitude) * 10000) / 10000;
        return { 
            ...point._doc, 
            distance  // Return distance as a double (no toFixed)
        };
    }).filter(point => point.distance <= 10);

    res.json(nearbyPoints);
});



app.get('/leaderboard', async (req, res) => {
    const userId = req.query.userId;

    try {
        // Fetch all users sorted by ecoPoints (descending order)
        const users = await User.find().sort({ ecoPoints: -1 }).exec();

        // Find the user's position in the leaderboard
        const user = users.find(u => u._id.toString() === userId);

        // Prepare the top 3 users
        const top3 = users.slice(0, 3).map((user, index) => ({
            position: index + 1,
            username: user.username,
            ecoPoints: user.ecoPoints,
            carbonSaved: user.carbonSaved,
            caloriesBurned: user.caloriesBurned,
        }));

        if (user && users.indexOf(user) < 3) {
            // If the user is in the top 3, return only the top 3 list
            return res.status(200).json({ leaderboard: top3 });
        }

        // If the user is not in the top 3, add their details to the list
        const userPosition = user ? users.indexOf(user) + 1 : null;
        const userDetails = user
            ? {
                  position: userPosition,
                  username: user.username,
                  ecoPoints: user.ecoPoints,
                  carbonSaved: user.carbonSaved,
                  caloriesBurned: user.caloriesBurned,
              }
            : null;

        const leaderboard = userDetails
            ? [...top3, userDetails] // Include the top 3 and user details
            : top3; // Default to top 3 only if user is not found

        return res.status(200).json({ leaderboard });
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
module.exports = app;
