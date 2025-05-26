"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // For Profile Image

// Import category services and types
import { 
    Category, 
    fetchUserCategories, 
    createCategory, 
    updateCategoryName, 
    deleteCategory 
} from "@/services/categoryService";

// Import user profile services and types
import { 
    UserPublic, 
    UserUpdatePayload, 
    fetchUserProfile, 
    updateUserProfile,
    UserPasswordChangePayload, // New import for password change
    changePassword             // New import for password change
} from "@/services/authService"; 

// --- Modal component ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-modalShow">
        <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        {children}
      </div>
      <style jsx global>{`
        @keyframes modalShow { to { transform: scale(1); opacity: 1; } }
        .animate-modalShow { transform: scale(0.95); opacity: 0; animation: modalShow 0.3s forwards; }
      `}</style>
    </div>
  );
};
// --- End Modal ---


export default function SettingsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Profile Details State
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [editableProfile, setEditableProfile] = useState<UserUpdatePayload>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateProfileSuccess, setUpdateProfileSuccess] = useState<string | null>(null);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [createCategoryError, setCreateCategoryError] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<Category | null>(null);
  const [renamedCategoryName, setRenamedCategoryName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // --- Change Password State ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  // --- End Change Password State ---


  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login?message=Please log in to access settings.");
    } else {
      loadPageData();
    }
  }, [router]);

  const loadPageData = async () => {
    setIsLoadingProfile(true); // Set loading before fetching profile
    setIsLoadingCategories(true); // Set loading before fetching categories
    await Promise.all([loadUserProfile(), loadCategories()]);
  };

  const loadUserProfile = async () => { 
    setErrorProfile(null);
    try { 
      const userProfileData = await fetchUserProfile(); 
      setProfile(userProfileData); 
      setEditableProfile({ 
        firstname: userProfileData.firstname,
        lastname: userProfileData.lastname,
        age: userProfileData.age,
        university_name: userProfileData.university_name,
        image: userProfileData.image,
      });
    } catch (err: unknown) { 
      setErrorProfile(err instanceof Error ? err.message : "Failed to load profile."); 
    } finally { 
      setIsLoadingProfile(false); 
    }
  };

  const handleProfileInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
    const { name, value } = e.target;
    setEditableProfile(prev => ({ ...prev, [name]: name === 'age' ? (value === '' ? null : parseInt(value, 10)) : value }));
  };

  const handleProfileUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => { 
    event.preventDefault(); 
    setIsUpdatingProfile(true); 
    setErrorProfile(null); 
    setUpdateProfileSuccess(null);
    try { 
      const updatedProfileData = await updateUserProfile(editableProfile); 
      setProfile(updatedProfileData); 
      setIsEditingProfile(false); 
      setUpdateProfileSuccess("Profile updated successfully!");
      setTimeout(() => setUpdateProfileSuccess(null), 3000); 
    } catch (err: unknown) { 
      setErrorProfile(err instanceof Error ? err.message : "Failed to update profile.");
    } finally { 
      setIsUpdatingProfile(false); 
    }
  };

  const loadCategories = async () => {  
    setIsLoadingCategories(true);
    setErrorCategories(null); 
    try {
      const userCategories = await fetchUserCategories();
      setCategories(userCategories.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      setErrorCategories(err instanceof Error ? err.message : "Failed to load categories."); 
    } finally {
      setIsLoadingCategories(false);
    }
  };
  
  const handleOpenCreateModal = () => { setNewCategoryName(""); setCreateCategoryError(null); setShowCreateModal(true); };
  
  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {  
    event.preventDefault(); if (!newCategoryName.trim()) { setCreateCategoryError("Category name cannot be empty."); return; }
    setIsCreatingCategory(true); setCreateCategoryError(null); 
    try { 
      const newCat = await createCategory({ name: newCategoryName }); 
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name))); 
      setShowCreateModal(false); 
      setNewCategoryName(""); 
    }
    catch (err: unknown) { setCreateCategoryError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsCreatingCategory(false); }
  };
  
  const handleOpenRenameModal = (category: Category) => { setCategoryToRename(category); setRenamedCategoryName(category.name); setRenameError(null); setShowRenameModal(true);};
  
  const handleRenameCategory = async (event: FormEvent<HTMLFormElement>) => { 
    event.preventDefault(); if (!categoryToRename || !renamedCategoryName.trim()) { setRenameError("Category name cannot be empty."); return; }
    setIsRenaming(true); setRenameError(null);
    try { 
      const updatedCategory = await updateCategoryName(categoryToRename.id, { name: renamedCategoryName }); 
      setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat).sort((a, b) => a.name.localeCompare(b.name))); 
      setShowRenameModal(false); 
      setCategoryToRename(null); 
    }
    catch (err: unknown) { setRenameError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsRenaming(false); }
  };

  const handleOpenDeleteModal = (category: Category) => { setCategoryToDelete(category); setDeleteError(null); setShowDeleteModal(true);};
  
  const handleConfirmDeleteCategory = async () => {  
    if (!categoryToDelete) return; 
    setIsDeleting(true); setDeleteError(null);
    try { 
      await deleteCategory(categoryToDelete.id); 
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id)); 
      setShowDeleteModal(false); 
      setCategoryToDelete(null); 
    }
    catch (err: unknown) { setDeleteError(err instanceof Error ? err.message : "An unknown error occurred."); }
    finally { setIsDeleting(false); }
  };

  // --- New Handler for Change Password ---
  const handleChangePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) { 
        setChangePasswordError("New password must be at least 6 characters long.");
        return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    // Explicitly type the payload
    const payload: UserPasswordChangePayload = { 
      current_password: currentPassword,
      new_password: newPassword,
      confirm_new_password: confirmNewPassword,
    };

    try {
      await changePassword(payload); // Pass the typed payload
      setChangePasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => setChangePasswordSuccess(null), 3000);
    } catch (err: unknown) {
      setChangePasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };
  // --- End New Handler ---

  if (!isClient || isLoadingProfile || isLoadingCategories) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading settings...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
            <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                &larr; Back to Dashboard
            </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">User Settings</h1>

        {/* Section 1: Profile Details */}
        <section id="profile-details" className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Profile Details</h2>
            {!isEditingProfile && profile && (
              <button 
                onClick={() => {
                  setIsEditingProfile(true); 
                  setErrorProfile(null); 
                  setUpdateProfileSuccess(null);
                  if (profile) {
                    setEditableProfile({
                      firstname: profile.firstname,
                      lastname: profile.lastname,
                      age: profile.age,
                      university_name: profile.university_name,
                      image: profile.image,
                    });
                  }
                }}
                className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-md hover:bg-indigo-600"
              >
                Edit Profile
              </button>
            )}
          </div>

          {errorProfile && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md mb-4 dark:bg-red-900 dark:text-red-200">{errorProfile}</div>}
          {updateProfileSuccess && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md mb-4 dark:bg-green-900 dark:text-green-200">{updateProfileSuccess}</div>}

          {!profile && !isLoadingProfile && !errorProfile && <p className="dark:text-gray-400">No profile data found.</p>}
          
          {profile && !isEditingProfile && (
            <div className="space-y-4 text-sm">
              {profile.image && <Image src={profile.image} alt="Profile" width={96} height={96} className="rounded-full mx-auto mb-4 object-cover" />}
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">First Name:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.firstname}</span></p>
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">Last Name:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.lastname}</span></p>
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">Email:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.email}</span></p>
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">Age:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.age ?? 'N/A'}</span></p>
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">University:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.university_name ?? 'N/A'}</span></p>
              <p><strong className="font-medium text-gray-700 dark:text-gray-300">Verified:</strong> <span className="text-gray-900 dark:text-gray-100">{profile.verified ? 'Yes' : 'No'}</span></p>
            </div>
          )}

          {isEditingProfile && profile && (
            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
              <div>
                <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                <input type="text" name="firstname" id="firstname" value={editableProfile.firstname || ''} onChange={handleProfileInputChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                <input type="text" name="lastname" id="lastname" value={editableProfile.lastname || ''} onChange={handleProfileInputChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
                <input type="number" name="age" id="age" value={editableProfile.age ?? ''} onChange={handleProfileInputChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label htmlFor="university_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">University Name</label>
                <input type="text" name="university_name" id="university_name" value={editableProfile.university_name || ''} onChange={handleProfileInputChange} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</label>
                <input type="url" name="image" id="image" value={editableProfile.image || ''} onChange={handleProfileInputChange} placeholder="https://example.com/image.png" className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isUpdatingProfile} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {isUpdatingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Section 2: Manage Categories */}
        <section id="manage-categories" className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Manage Your Categories</h2>
              <button onClick={handleOpenCreateModal} className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"> + Add New Category </button>
            </div>
            {errorCategories && !isLoadingCategories && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-300 mb-4">Error: {errorCategories}</div>}
            {categories.length === 0 && !isLoadingCategories && !errorCategories && (<p className="text-gray-500 dark:text-gray-400">You haven&apos;t created any categories yet.</p>)}
            {categories.length > 0 && (<ul className="space-y-3">{categories.map(category => (<li key={category.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm"><span className="text-gray-700 dark:text-gray-200">{category.name}</span><div className="space-x-2"><button onClick={() => handleOpenRenameModal(category)} className="text-xs px-3 py-1 bg-yellow-400 text-yellow-800 rounded hover:bg-yellow-500">Rename</button><button onClick={() => handleOpenDeleteModal(category)} className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button></div></li>))}</ul>)}
        </section>

        {/* --- Section 3: Change Password --- */}
        <section id="change-password" className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Change Password</h2>
          {changePasswordError && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md mb-4 dark:bg-red-900 dark:text-red-200">{changePasswordError}</div>}
          {changePasswordSuccess && <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md mb-4 dark:bg-green-900 dark:text-green-200">{changePasswordSuccess}</div>}
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
              <input type="password" name="currentPassword" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <input type="password" name="newPassword" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
              <input type="password" name="confirmNewPassword" id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isChangingPassword} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {isChangingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </section>
        {/* --- End Section 3 --- */}

        {/* Modals (Create, Rename, Delete Category) */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Category"> <form onSubmit={handleCreateCategory}><input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4" required />{createCategoryError && <p className="text-red-500 text-sm mb-2">{createCategoryError}</p>}<button type="submit" disabled={isCreatingCategory} className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">{isCreatingCategory ? "Creating..." : "Create"}</button></form></Modal>
        {categoryToRename && (<Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title={`Rename Category: ${categoryToRename.name}`}><form onSubmit={handleRenameCategory}><input type="text" value={renamedCategoryName} onChange={(e) => setRenamedCategoryName(e.target.value)} placeholder="New Category Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4" required />{renameError && <p className="text-red-500 text-sm mb-2">{renameError}</p>}<button type="submit" disabled={isRenaming} className="w-full px-4 py-2 bg-yellow-500 text-yellow-800 rounded hover:bg-yellow-600 disabled:opacity-50">{isRenaming ? "Renaming..." : "Save Changes"}</button></form></Modal>)}
        {categoryToDelete && (<Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete Category">{deleteError && <p className="text-red-500 text-sm mb-2">{deleteError}</p>}<p className="mb-4 dark:text-gray-300">Are you sure you want to delete the category &quot;{categoryToDelete.name}&quot;? Books in this category will become uncategorized.</p><div className="flex justify-end space-x-3"><button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 disabled:opacity-50">Cancel</button><button onClick={handleConfirmDeleteCategory} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">{isDeleting ? "Deleting..." : "Delete"}</button></div></Modal>)}
      </div>
    </div>
  );
}
