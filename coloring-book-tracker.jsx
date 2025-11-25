import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuration PDF.js - utiliser le worker CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function ColoringBookTracker() {
  const [books, setBooks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formPages, setFormPages] = useState('');
  const [formCover, setFormCover] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  // Charger les livres depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('coloringBooks');
    if (saved) {
      setBooks(JSON.parse(saved));
    }
  }, []);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('coloringBooks', JSON.stringify(books));
  }, [books]);

  // Extraire la première page du PDF comme image
  const extractCoverFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const page = await pdf.getPage(1);
          
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Gérer l'upload de PDF
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF');
      return;
    }
    
    setIsLoading(true);
    try {
      const cover = await extractCoverFromPDF(file);
      setFormCover(cover);
    } catch (error) {
      console.error('Erreur extraction PDF:', error);
      alert('Erreur lors de l\'extraction de la couverture');
    }
    setIsLoading(false);
  };

  // Ajouter ou modifier un livre
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formName || !formPages || !formCover) {
      alert('Veuillez remplir tous les champs et uploader un PDF');
      return;
    }

    const pageCount = parseInt(formPages);
    
    if (isEditing && editingBook) {
      // Modification
      setBooks(books.map(book => 
        book.id === editingBook.id 
          ? { ...book, name: formName, totalPages: pageCount, cover: formCover }
          : book
      ));
    } else {
      // Création
      const newBook = {
        id: Date.now(),
        name: formName,
        totalPages: pageCount,
        cover: formCover,
        completedPages: [],
        createdAt: new Date().toISOString()
      };
      setBooks([...books, newBook]);
    }
    
    resetForm();
    setIsModalOpen(false);
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormName('');
    setFormPages('');
    setFormCover(null);
    setIsEditing(false);
    setEditingBook(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Ouvrir le modal de modification
  const openEditModal = (book, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingBook(book);
    setFormName(book.name);
    setFormPages(book.totalPages.toString());
    setFormCover(book.cover);
    setIsModalOpen(true);
  };

  // Supprimer un livre
  const deleteBook = (bookId, e) => {
    e.stopPropagation();
    if (confirm('Supprimer ce livre de coloriage ?')) {
      setBooks(books.filter(book => book.id !== bookId));
    }
  };

  // Toggle page complétée
  const togglePage = (pageNum) => {
    if (!selectedBook) return;
    
    setBooks(books.map(book => {
      if (book.id === selectedBook.id) {
        const completed = book.completedPages.includes(pageNum)
          ? book.completedPages.filter(p => p !== pageNum)
          : [...book.completedPages, pageNum];
        return { ...book, completedPages: completed };
      }
      return book;
    }));
    
    setSelectedBook(prev => {
      const completed = prev.completedPages.includes(pageNum)
        ? prev.completedPages.filter(p => p !== pageNum)
        : [...prev.completedPages, pageNum];
      return { ...prev, completedPages: completed };
    });
  };

  // Calculer la progression
  const getProgress = (book) => {
    return Math.round((book.completedPages.length / book.totalPages) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-rose-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Mes Coloriages</h1>
              <p className="text-xs text-rose-400">{books.length} livre{books.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter
          </button>
        </div>
      </header>

      {/* Grille des livres */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">Aucun livre de coloriage</h2>
            <p className="text-gray-400 mb-6">Commencez par ajouter votre premier livre !</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
            >
              Ajouter un livre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map(book => (
              <div
                key={book.id}
                onClick={() => { setSelectedBook(book); setIsDetailOpen(true); }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-rose-100 group-hover:shadow-xl group-hover:shadow-rose-200 transform group-hover:-translate-y-1 transition-all duration-300">
                  <img 
                    src={book.cover} 
                    alt={book.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
                      style={{ width: `${getProgress(book)}%` }}
                    />
                  </div>
                  
                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEditModal(book, e)}
                      className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => deleteBook(book.id, e)}
                      className="p-2 bg-white/90 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Badge progression */}
                  <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-rose-500 shadow-sm">
                    {getProgress(book)}%
                  </div>
                </div>
                
                <div className="mt-3 px-1">
                  <h3 className="font-medium text-gray-800 truncate">{book.name}</h3>
                  <p className="text-sm text-gray-400">{book.completedPages.length}/{book.totalPages} pages</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Ajout/Modification */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-rose-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditing ? 'Modifier le livre' : 'Nouveau livre'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="p-2 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Upload PDF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier PDF
                </label>
                <div 
                  className={`relative border-2 border-dashed rounded-2xl transition-colors ${
                    formCover ? 'border-rose-300 bg-rose-50' : 'border-gray-200 hover:border-rose-300'
                  }`}
                >
                  {formCover ? (
                    <div className="p-4 flex items-center gap-4">
                      <img src={formCover} alt="Couverture" className="w-16 h-20 object-cover rounded-lg shadow-md" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">Couverture extraite</p>
                        <button
                          type="button"
                          onClick={() => { setFormCover(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-xs text-rose-500 hover:text-rose-600 mt-1"
                        >
                          Changer de fichier
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-8 cursor-pointer">
                      {isLoading ? (
                        <div className="w-10 h-10 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-3">
                            <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-600">Cliquez pour uploader</p>
                          <p className="text-xs text-gray-400 mt-1">PDF uniquement</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du livre
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Mandalas Zen"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
                />
              </div>

              {/* Nombre de pages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de pages
                </label>
                <input
                  type="number"
                  min="1"
                  value={formPages}
                  onChange={(e) => setFormPages(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-rose-200 hover:shadow-xl transition-all"
                >
                  {isEditing ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail / Pages */}
      {isDetailOpen && selectedBook && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-rose-100 flex items-center gap-4 shrink-0">
              <img 
                src={selectedBook.cover} 
                alt={selectedBook.name}
                className="w-14 h-18 object-cover rounded-xl shadow-md"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-800 truncate">{selectedBook.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-500">
                    {selectedBook.completedPages.length}/{selectedBook.totalPages} pages
                  </span>
                  <div className="flex-1 h-2 bg-rose-100 rounded-full overflow-hidden max-w-32">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500"
                      style={{ width: `${getProgress(selectedBook)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-rose-500">{getProgress(selectedBook)}%</span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-2 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grille des pages */}
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">Cochez les pages que vous avez terminées :</p>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {Array.from({ length: selectedBook.totalPages }, (_, i) => i + 1).map(pageNum => {
                  const isCompleted = selectedBook.completedPages.includes(pageNum);
                  return (
                    <button
                      key={pageNum}
                      onClick={() => togglePage(pageNum)}
                      className={`aspect-square rounded-xl font-medium text-sm transition-all duration-200 ${
                        isCompleted
                          ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-lg shadow-rose-200 scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        pageNum
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-rose-100 bg-rose-50/50 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {selectedBook.completedPages.length === selectedBook.totalPages ? (
                    <span className="text-rose-500 font-medium">🎉 Livre terminé !</span>
                  ) : (
                    `Encore ${selectedBook.totalPages - selectedBook.completedPages.length} page${selectedBook.totalPages - selectedBook.completedPages.length > 1 ? 's' : ''} à colorier`
                  )}
                </p>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2 bg-white border border-rose-200 text-rose-500 rounded-xl font-medium hover:bg-rose-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Style pour les animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
