const mongoose=require('mongoose');

// Delete model if it exists to force recompilation with new schema
if (mongoose.models.user) {
  delete mongoose.models.user;
  delete mongoose.modelSchemas.user;
}

const userSchema= new mongoose.Schema({
    name: { type: String, required: true },
    email: { 
        type: String, 
        required: false, // Not required at schema level - we'll validate in pre-save hook
        unique: true, 
        sparse: true 
    },
    phone: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    password: { type: String }, // Optional for OAuth users and guests
    googleId: { type: String, unique: true, sparse: true }, // For Google OAuth
    picture: { type: String }, // Profile picture from OAuth
    provider: { type: String, enum: ['local', 'google'], default: 'local' }, // Auth provider
    emailVerified: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['ACTIVE', 'INVITED', 'GUEST'], 
        default: 'ACTIVE' 
    },
    // For account claiming - link INVITED users to ACTIVE accounts
    invitedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'user' 
    },
    invitedAt: { type: Date },
    // Track if user was created from invitation
    invitationToken: { type: String },
    // Balance tracking (net amount owed/owed to others)
    balance: { type: Number, default: 0 },
    // Payment details for receiving payments
    paymentDetails: {
      upiId: { type: String },
      bankAccountNumber: { type: String },
      bankIFSC: { type: String },
      bankName: { type: String },
      accountHolderName: { type: String },
      // Payment preferences
      preferredPaymentMethod: { 
        type: String, 
        enum: ['UPI', 'BANK_TRANSFER', 'BOTH', 'NONE'],
        default: 'NONE'
      },
      // Show payment details in invitations
      showPaymentDetails: { type: Boolean, default: false }
    },
},{timestamps:true});

// Custom validation: 
// - INVITED users must have either email or phone
// - ACTIVE users must have email
userSchema.pre('validate', function(next) {
    // Ensure status is set (default to ACTIVE if not set)
    if (!this.status) {
        this.status = 'ACTIVE';
    }
    
    // ACTIVE users must have email
    if (this.status === 'ACTIVE') {
        if (!this.email || (typeof this.email === 'string' && this.email.trim().length === 0)) {
            this.invalidate('email', 'Email is required for ACTIVE users');
            return next();
        }
    }
    
    // INVITED users must have either email or phone (but not both required)
    if (this.status === 'INVITED') {
        const hasEmail = this.email && typeof this.email === 'string' && this.email.trim().length > 0;
        const hasPhone = this.phone && typeof this.phone === 'string' && this.phone.trim().length > 0;
        
        if (!hasEmail && !hasPhone) {
            this.invalidate('email', 'INVITED users must have either email or phone');
            this.invalidate('phone', 'INVITED users must have either phone or email');
        }
        // If INVITED user has phone but no email, that's fine - don't require email
        // If INVITED user has email but no phone, that's also fine
    }
    
    // GUEST users don't need email or phone (no validation needed)
    
    next();
});

// Indexes for efficient lookups
// Note: email and phone already have unique indexes from 'unique: true' above
userSchema.index({ status: 1 });
userSchema.index({ invitationToken: 1 });

module.exports=mongoose.model('user',userSchema);