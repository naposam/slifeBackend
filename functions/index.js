const functions = require('firebase-functions');
const admin = require('firebase-admin');
 admin.initializeApp();
 const app = require('express')();

 const Config = {
    apiKey: "AIzaSyDhcf-3erAccooBxsmYfshv7fTXnpdDrbQ",
    authDomain: "blood-donation-app-9f85b.firebaseapp.com",
    databaseURL: "https://blood-donation-app-9f85b.firebaseio.com",
    projectId: "blood-donation-app-9f85b",
    storageBucket: "blood-donation-app-9f85b.appspot.com",
    messagingSenderId: "445038358092",
    appId: "1:445038358092:web:adfc628b7268b34d"
  };
 

 const firebase = require('firebase')

 firebase.initializeApp(Config)

  const db = admin.firestore();

app.get('/getusers', (req, res) => {
    db
    .collection('Signup')
    .orderBy('desc') 
    .get()
     .then((data) =>{
      let users = [];
      data.forEach((doc) =>{
      users.push({
        userId: doc.id,
        ...doc.data()   
      });
      });
      return res.json(users);
  })
  .catch((err) =>console.error(err));

})

//getting all Users

exports.getUsers = functions.https.onRequest((req, res)=>{
    db
    .collection('users')
    .get()
    .then((data) =>{
      let users = [];
      data.forEach((doc) =>{
      users.push({
        userId: doc.id,
        ...doc.data() 
      })
      })
      return res.json(users)
  })
  .catch((err )=>console.error(err));
  
})
const FBAUTH = (req, res, next) =>{
    let IdToken;
    if(req.headers.authorization && req.headers.authorization.startWith('Bearer ')){
       IdToken = req.headers.authorization.split('Bearer ')[1]
    }else{
        console.error('no taken found')
        return res.status(403).json({error: 'Unauthorized'})
    }

    admin.auth().verifyIdToken(IdToken)
     .then((decodedToken) =>{
         req.user = decodedToken
         console.log(decodedToken)
         return db.collection('users')
         .where('userId', '==', req.user.uid)
         .limit(1)
         .get()
     })

     .then((data) =>{
         req.user.phonenumber = data.docs[0].data().phonenumber
         return next()
     })
     .catch((err) =>{
         console.error('Error while verifying the token',err)
         res.status(403).json(err)
     })
}


///first create users
app.post('/createUser', (req, res)=>{ 
    const newUser = {
        FullName: req.body.FullName,
        BloodType: req.body.BloodType,
        Email: req.body.Email,
        PhoneNumber: req.body.PhoneNumber
    }
    db
    .collection('Signup')
    .add(newUser)
    .then(doc =>{
        res.json({message: `document ${doc.id} newUser created successfully`})

    })
    .catch(err => {
        res.status(500).json({error: 'something went wrong'})
        console.error(err);
        
    })
    
  })

  //validation on creating User
       const isEmail = (email) => {
        const RegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(email.match(RegEx)) return true;
          else return false;
         
    }
  const isEmpty  =(string) =>{
      if(string.trim() =='') return true
      else return false;
  }

 ///singup the users
 app.post('/signup', (req, res)=>{
     const addUser = {
         email: req.body.email,
         fullname: req.body.fullname,
         bloodtype: req.body.bloodtype,
         phonenumber: req.body.phonenumber,
         password: req.body.password,
         confirmpassword: req.body.confirmpassword,
     }
     //validation
      let errors ={};
     if(isEmpty(addUser.email)){
         errors.email = 'Must not be empty'
     }
     else if(!isEmail(addUser.email)){
         errors.email = 'Must be a valid email address'
     }

     if(isEmpty(addUser.password)) errors.password ='must not be empty'

     if(addUser.password !== addUser.confirmpassword) errors.confirmpassword = 'Password must match'

     if(isEmpty(addUser.phonenumber)) errors.phonenumber = 'must not be empty'
     if(isEmpty(addUser.bloodtype)) errors.bloodtype = 'must not be empty'
     if(isEmpty(addUser.fullname)) errors.fullname = 'must not be empty'
     
     if(Object.keys(errors).length > 0) res.status(400).json(errors)
     let token, userId
      db.doc(`/users/${addUser.phonenumber}`)
        .get()
        .then((doc) =>{
            if(doc.exists){
                return res.status(400)
                .json({phonenumber: 'The Phone number Already in use'})
            }else{
          return firebase
           .auth()
           .createUserWithEmailAndPassword(addUser.email, addUser.password)
            }
        })
        .then((data) =>{
            userId = data.user.uid
            return data.user.getIdToken();
            
        })
         .then((IdToken )=>{
             token = IdToken
             const userCredential ={
                 fullname: addUser.fullname,
                 email: addUser.email,
                 bloodtype: addUser.bloodtype,
                 phonenumber:addUser.phonenumber,
                 userId
             }
             return db.doc(`/users/${addUser.phonenumber}`).set(userCredential)
            //  return res.status(201).json({token})
         })
         .then(() => {
          return res.status(201).json({ token })
         })
           
         .catch((err) =>{
                    console.error(err)
                    if(err.code ==='auth/email-already-in-use'){
                        return res.status(400).json({email: 'Email already use by another user'})
                    }else{
                        return res.status(500).json({error: err.code})
                    }
                   
                })

    //  firebase
    //   .auth()
    //   .createUserWithEmailAndPassword(addUser.email, addUser.password)
    //     .then((data) =>{
    //         return res
    //         .status(201)
    //         .json({message: `user ${data.user.uid} signed up successfully`})
    //     })
    //     .catch((err) =>{
    //         console.error(err)
    //         return res.status(500).json({error: err.code})
    //     })
 })

 ///
  app.post('/submitUser', (req, res)=>{
    const subNewUser={
      fullname: req.body.fullname,
      email: req.body.email,
      bloodytype: req.body.bloodtype, 
      phonenumber: req.body.phonenumber,
      password: req.body.password, 
      confirmpassword: req.body.confirmpassword
      } 
      firebase.auth().createUserWithEmailAndPassword(subNewUser.email, subNewUser.password)
      .then((data) =>{
        let userId = data.user.uid
        console.log('user id is', userId)
        db.collection('/users').doc(subNewUser.phonenumber)
        .set({
          fullname: subNewUser.fullname,
          bloodytype: subNewUser.bloodytype,
          phonenumber: subNewUser.phonenumber,
          email: subNewUser.email,
          userId: userId
          
        })
        
      })
      .then(() =>{
        console.log(`${fullname} Data  save Successfull`)
      })
      
      .catch((err) =>{
        console.log('can not create user:', err)
      })
})

      //login
    app.post('/login', (req, res) =>{
        const user ={
            email:req.body.email,
            password:req.body.password
        }

        let errors ={}

        if(isEmpty(user.email)) errors.email = 'must not be empty'
        if(isEmpty(user.password)) errors.password = 'must not be empty'

        if(Object.keys(errors).length > 0) return res.status(400).json(errors)

        firebase.auth().signInWithEmailAndPassword(user.email, user.password)
          .then((data) =>{
              return data.user.getIdToken()
          })
         .then(token =>{
             return res.json({token})
         })
         .catch((err) =>{
             console.error(err)
             if(err.code === 'auth/wrong-password'){
                 return res.status(403).json({general: 'Wrong Credentials please try again'})
             }else return res.status(400).json({error: err.code})
         })
        
    })

  exports.api = functions.https.onRequest(app)