import multer from 'multer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../frontend/public'); // Specify the destination folder for uploaded files , cb-callback function used to specify the destination folder for uploaded files 
    },
    filename: (req, file, cb) => {
        cb(null,file.originalname); // Use the original file name for the uploaded file
    }
});

export const upload = multer({ storage });