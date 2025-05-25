"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // For a "Back to Dashboard" link or navigation

// Import category services and types
import { 
    Category, 
    fetchUserCategories, 
    createCategory, 
    updateCategoryName, 
    deleteCategory 
} from "@/services/categoryService";

// Re-using the Modal component (ensure it's either here or imported from a shared location)
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md animate-modalShow">
        <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        {children}
      </div>
      {/* Animation style (can be global) */}
      <style jsx global>{`
        @keyframes modalShow { to { transform: scale(1); opacity: 1; } }
        .animate-modalShow { transform: scale(0.95); opacity: 0; animation: modalShow 0.3s forwards; }
      `}</style>
    </div>
  );
};


export default function SettingsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);
  
  // Create Category Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Rename Category Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<Category | null>(null);
  const [renamedCategoryName, setRenamedCategoryName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete Category Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);


  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/login?message=Please log in to access settings.");
    } else {
      loadCategories();
    }
  }, [router]);

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

  // --- Create Category Handlers ---
  const handleOpenCreateModal = () => {
    setNewCategoryName("");
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      setCreateError("Category name cannot be empty.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const newCat = await createCategory({ name: newCategoryName });
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setShowCreateModal(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Rename Category Handlers ---
  const handleOpenRenameModal = (category: Category) => {
    setCategoryToRename(category);
    setRenamedCategoryName(category.name);
    setRenameError(null);
    setShowRenameModal(true);
  };

  const handleRenameCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryToRename || !renamedCategoryName.trim()) {
      setRenameError("Category name cannot be empty.");
      return;
    }
    setIsRenaming(true);
    setRenameError(null);
    try {
      const updatedCategory = await updateCategoryName(categoryToRename.id, { name: renamedCategoryName });
      setCategories(prev => 
        prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
            .sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowRenameModal(false);
      setCategoryToRename(null);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsRenaming(false);
    }
  };

  // --- Delete Category Handlers ---
  const handleOpenDeleteModal = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };


  if (!isClient || isLoadingCategories) {
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

        {/* Placeholder for Tabs - For now, just "Manage Categories" section */}
        {/* <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Profile Details (Coming Soon)
            </button>
            <button className="border-indigo-500 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" aria-current="page">
              Manage Categories
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Account (Coming Soon)
            </button>
          </nav>
        </div>
        */}

        {/* Section 2: Manage Categories */}
        <section id="manage-categories" className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Manage Your Categories</h2>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              + Add New Category
            </button>
          </div>

          {errorCategories && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-300 mb-4">Error: {errorCategories}</div>}
          
          {categories.length === 0 && !isLoadingCategories && !errorCategories && (
            <p className="text-gray-500 dark:text-gray-400">You haven&apos;t created any categories yet.</p>
          )}

          {categories.length > 0 && (
            <ul className="space-y-3">
              {categories.map(category => (
                <li key={category.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm">
                  <span className="text-gray-700 dark:text-gray-200">{category.name}</span>
                  <div className="space-x-2">
                    <button 
                      onClick={() => handleOpenRenameModal(category)}
                      className="text-xs px-3 py-1 bg-yellow-400 text-yellow-800 rounded hover:bg-yellow-500"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => handleOpenDeleteModal(category)}
                      className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Create Category Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Category">
          <form onSubmit={handleCreateCategory}>
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category Name"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4" 
              required
            />
            {createError && <p className="text-red-500 text-sm mb-2">{createError}</p>}
            <button type="submit" disabled={isCreating} className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
              {isCreating ? "Creating..." : "Create"}
            </button>
          </form>
        </Modal>

        {/* Rename Category Modal */}
        {categoryToRename && (
          <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title={`Rename Category: ${categoryToRename.name}`}>
            <form onSubmit={handleRenameCategory}>
              <input 
                type="text" 
                value={renamedCategoryName} 
                onChange={(e) => setRenamedCategoryName(e.target.value)}
                placeholder="New Category Name"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4" 
                required
              />
              {renameError && <p className="text-red-500 text-sm mb-2">{renameError}</p>}
              <button type="submit" disabled={isRenaming} className="w-full px-4 py-2 bg-yellow-500 text-yellow-800 rounded hover:bg-yellow-600 disabled:opacity-50">
                {isRenaming ? "Renaming..." : "Save Changes"}
              </button>
            </form>
          </Modal>
        )}

        {/* Delete Category Modal */}
        {categoryToDelete && (
           <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete Category">
             {deleteError && <p className="text-red-500 text-sm mb-2">{deleteError}</p>}
            <p className="mb-4 dark:text-gray-300">Are you sure you want to delete the category &quot;{categoryToDelete.name}&quot;? Books in this category will become uncategorized.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirmDeleteCategory} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </Modal>
        )}

      </div>
    </div>
  );
}