document.getElementById("upload-btn").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  
  if (file) {
      // Check if the file is a JPEG image
      if (file.type !== "image/jpeg") {
          alert("Only JPEG images are allowed. Please upload a valid JPEG file.");
          event.target.value = ""; // Clear the file input
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          document.getElementById("preview").src = e.target.result;
          document.getElementById("preview").style.display = "block";
          document.getElementById("highlighted-image").style.display = "none";
          document.getElementById("legend-container").style.display = "none";
          document.getElementById("explanation").textContent = ""; // Clear previous explanation
      };
      reader.readAsDataURL(file);
      sendImageToBackend(file);
  }
});

  
  function sendImageToBackend(file) {
    const result = document.getElementById("result");
    const explanation = document.getElementById("explanation");
    const loader = document.getElementById("loader");
    const highlightedImage = document.getElementById("highlighted-image");
    const legendContainer = document.getElementById("legend-container");
    const legendImage = document.getElementById("legend-image");
    const downloadBtn = document.getElementById("download-btn");
  
    result.textContent = "Analyzing...";
    result.style.color = "white";
    explanation.textContent = "";
    highlightedImage.style.display = "none";
    legendContainer.style.display = "none"; // Hide legend initially
    loader.style.display = "block";
    downloadBtn.style.display = "none"; // Hide initially
  
    const formData = new FormData();
    formData.append("file", file);
  
    fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        loader.style.display = "none";
        if (data.error) throw new Error(data.error);
  
        result.textContent = `Result: ${data.label}`;
        result.style.color = data.label === "Tampered" ? "red" : "green";
        typeText(explanation, `Explanation: ${data.explanation}`);
  
        if (data.highlighted_img) {
          highlightedImage.src = `data:image/png;base64,${data.highlighted_img}`;
          highlightedImage.style.display = "block";
  
          // ✅ Show download button when analysis is done
          downloadBtn.style.display = "block";
  
          // ✅ Attach event listener to download the PDF Report
          downloadBtn.onclick = () => downloadReport(data);
        }

         // ✅ Handle SHAP Legend Image
         if (data.legend_img) {
          legendImage.src = `data:image/png;base64,${data.legend_img}`;
          legendContainer.style.display = "block"; // Show the legend
        } 
      })


      .catch((error) => {
        loader.style.display = "none";
        console.error("Error:", error);
        result.textContent = `An error occurred: ${error.message}`;
        result.style.color = "red";
      });
  }
  
  // ✅ Function to Create Typing Effect with Bold Formatting
  function typeText(element, text, speed = 20) {
    element.innerHTML = ""; // Clear the element before typing
    let i = 0;
  
    function type() {
      if (i < text.length) {
        // Preserve bold formatting for Explanation, TAMPERED/REAL, and Confidence
        let formattedText = text
          .substring(0, i + 1)
          .replace(/^Explanation:/, "<strong>Explanation:</strong>") // Bold "Explanation:"
          .replace(/\*\*(TAMPERED|REAL)\*\*/g, "<strong>$1</strong>") // Bold classification
          .replace(/\*\*(\d+\.\d+%)\*\*/g, "<strong>$1</strong>"); // Bold confidence percentage
  
        element.innerHTML = formattedText;
        i++;
        setTimeout(type, speed);
      }
    }
    type();
  }
  
  // ✅ Function to Download Report as PDF
  function downloadReport(data) {
    fetch("http://127.0.0.1:5000/download_report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: data.label,
        confidence: data.confidence,
        explanation: data.explanation,
        highlighted_img: data.highlighted_img,
      }),
    })
      .then((response) => response.blob()) // Expect PDF file
      .then((blob) => {
        const pdfUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = "Tampering_Report.pdf"; // Set filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch((error) => console.error("Error downloading report:", error));
  }
  
  // Create starry background
  const starsContainer = document.querySelector(".stars");
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.classList.add("star");
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    starsContainer.appendChild(star);
  }
  
  // Create floating particles
  const particlesContainer = document.querySelector(".particles");
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.width = `${Math.random() * 10 + 5}px`;
    particle.style.height = particle.style.width;
    particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
    particle.style.animationDelay = `${Math.random() * 5}s`;
    particlesContainer.appendChild(particle);
  }
  
  // Translations
  const translations = {
    en: {
      settings: "Settings",
      language: "Language",
      instructions: "Instructions",
      mainTitle: "Uncover the Truth Behind Every Image",
      subTitle: "Upload an Image to Reveal Hidden Edits and Ensure Authenticity",
      upload: "Upload",
      clear: "Clear",
      scan: "Scan",
      results: "Results",
      confidenceScore: "Confidence Score",
      explainableAI: "Explainable AI",
      noTampering: "No Tampering Detected.",
      instructionsList: [
        "Choose your preferred theme from the options below.",
        "Select your preferred language from the dropdown menu.",
        "Use the scan button to analyze uploaded images.",
        "Wait for the analysis to complete before viewing results.",
        "Check the confidence score to determine image authenticity.",
        "Contact support if you encounter any technical issues.",
      ],
      theme: "Choose Theme",
      featured: "Featured",
      featuredContent: "Check out our latest features and updates!",
    },
    tl: {
      settings: "Mga Setting",
      language: "Wika",
      instructions: "Mga Tagubilin",
      mainTitle: "Tuklasin ang Katotohanan sa Bawat Larawan",
      subTitle:
        "Mag-upload ng Larawan para Malaman ang mga Nakatagong Pagbabago at Tiyakin ang Pagiging Tunay",
      upload: "Mag-upload",
      clear: "Burahin",
      scan: "I-scan",
      results: "Mga Resulta",
      confidenceScore: "Antas ng Kumpiyansa",
      explainableAI: "Maipaliwanag na AI",
      noTampering: "Walang Natuklasang Pagmamanipula.",
      instructionsList: [
        "Piliin ang iyong gustong tema mula sa mga opsyon sa ibaba.",
        "Piliin ang iyong gustong wika mula sa dropdown menu.",
        "Gamitin ang scan button upang suriin ang mga na-upload na larawan.",
        "Maghintay hanggang matapos ang pagsusuri bago tingnan ang mga resulta.",
        "Suriin ang confidence score upang matukoy ang pagiging tunay ng larawan.",
        "Makipag-ugnayan sa support kung may mga teknikal na isyu.",
      ],
      theme: "Piliin ang Tema",
      featured: "Tampok",
      featuredContent: "Tingnan ang aming pinakabagong mga feature at update!",
    },
    es: {
      settings: "Configuración",
      language: "Idioma",
      instructions: "Instrucciones",
      mainTitle: "Descubre la Verdad Detrás de Cada Imagen",
      subTitle:
        "Sube una Imagen para Revelar Ediciones Ocultas y Asegurar su Autenticidad",
      upload: "Subir",
      clear: "Limpiar",
      scan: "Escanear",
      results: "Resultados",
      confidenceScore: "Nivel de Confianza",
      explainableAI: "IA Explicable",
      noTampering: "No se Detectó Manipulación.",
      instructionsList: [
        "Elija su tema preferido de las opciones a continuación.",
        "Seleccione su idioma preferido del menú desplegable.",
        "Use el botón de escaneo para analizar imágenes cargadas.",
        "Espere a que se complete el análisis antes de ver los resultados.",
        "Verifique el puntaje de confianza para determinar la autenticidad de la imagen.",
        "Contacte con soporte si encuentra problemas técnicos.",
      ],
      theme: "Elegir Tema",
      featured: "Destacado",
      featuredContent:
        "¡Mira nuestras últimas características y actualizaciones!",
    },
    de: {
      settings: "Einstellungen",
      language: "Sprache",
      instructions: "Anleitung",
      mainTitle: "Entdecken Sie die Wahrheit hinter jedem Bild",
      subTitle:
        "Laden Sie ein Bild hoch, um versteckte Bearbeitungen aufzudecken und Authentizität sicherzustellen",
      upload: "Hochladen",
      clear: "Löschen",
      scan: "Scannen",
      results: "Ergebnisse",
      confidenceScore: "Vertrauenswert",
      explainableAI: "Erklärbare KI",
      noTampering: "Keine Manipulation erkannt.",
      instructionsList: [
        "Wählen Sie Ihr bevorzugtes Theme aus den Optionen unten.",
        "Wählen Sie Ihre bevorzugte Sprache aus dem Dropdown-Menü.",
        "Verwenden Sie die Scan-Schaltfläche, um hochgeladene Bilder zu analysieren.",
        "Warten Sie, bis die Analyse abgeschlossen ist, bevor Sie die Ergebnisse ansehen.",
        "Überprüfen Sie den Vertrauenswert, um die Authentizität des Bildes zu bestimmen.",
        "Kontaktieren Sie den Support bei technischen Problemen.",
      ],
      theme: "Theme Wählen",
      featured: "Empfohlen",
      featuredContent:
        "Sehen Sie sich unsere neuesten Funktionen und Updates an!",
    },
    ja: {
      settings: "設定",
      language: "言語",
      instructions: "手順",
      mainTitle: "すべての画像の真実を明らかに",
      subTitle: "画像をアップロードして隠された編集を検出し、信頼性を確保",
      upload: "アップロード",
      clear: "クリア",
      scan: "スキャン",
      results: "結果",
      confidenceScore: "信頼度スコア",
      explainableAI: "説明可能なAI",
      noTampering: "改ざんは検出されませんでした。",
      instructionsList: [
        "以下のオプションから希望のテーマを選択してください。",
        "ドロップダウンメニューから希望の言語を選択してください。",
        "スキャンボタンを使用してアップロードした画像を分析します。",
        "結果を表示する前に分析が完了するまでお待ちください。",
        "信頼度スコアを確認して画像の信頼性を判断してください。",
        "技術的な問題が発生した場合はサポートにお問い合わせください。",
      ],
      theme: "テーマを選択",
      featured: "おすすめ",
      featuredContent: "最新の機能とアップデートをチェック！",
    },
    ko: {
      settings: "설정",
      language: "언어",
      instructions: "지침",
      mainTitle: "모든 이미지 뒤에 숨겨진 진실을 발견하세요",
      subTitle: "이미지를 업로드하여 숨겨진 편집을 확인하고 신뢰성을 보장하세요",
      upload: "업로드",
      clear: "지우기",
      scan: "스캔",
      results: "결과",
      confidenceScore: "신뢰도 점수",
      explainableAI: "설명 가능한 AI",
      noTampering: "조작이 감지되지 않았습니다.",
      instructionsList: [
        "아래 옵션에서 원하는 테마를 선택하세요.",
        "드롭다운 메뉴에서 원하는 언어를 선택하세요.",
        "스캔 버튼을 사용하여 업로드된 이미지를 분석하세요.",
        "결과를 보기 전에 분석이 완료될 때까지 기다리세요.",
        "신뢰도 점수를 확인하여 이미지의 진위를 판단하세요.",
        "기술적 문제가 발생하면 지원팀에 문의하세요.",
      ],
      theme: "테마 선택",
      featured: "추천",
      featuredContent: "최신 기능과 업데이트를 확인하세요!",
    },
  };
  
  // Language switching function
  function changeLanguage(lang) {
    const translation = translations[lang];
    if (!translation) return;
  
    // Update main interface text
    document.querySelector(".upload-section h1").textContent =
      translation.mainTitle;
    document.querySelector(".upload-section > p").textContent =
      translation.subTitle;
    document.querySelector(".upload-button").textContent = translation.upload;
    document.getElementById("clearButton").textContent = translation.clear;
    document.getElementById("scanButton").textContent = translation.scan;
  
    // Update results section
    const resultSection = document.getElementById("resultSection");
    if (resultSection) {
      resultSection.querySelector("h2").textContent = translation.results;
      resultSection.querySelector("strong:first-of-type").textContent =
        translation.confidenceScore + ":";
      resultSection.querySelector("strong:last-of-type").textContent =
        translation.explainableAI + ":";
  
      const aiExplanation = document.getElementById("aiExplanation");
      if (aiExplanation.textContent.includes("No Tampering Detected")) {
        aiExplanation.textContent = translation.noTampering;
      }
    }
  
    // Update modal content
    document.getElementById("settingsTitle").textContent = translation.settings;
    document.getElementById("languageTitle").textContent = translation.language;
    document.getElementById("instructionsTitle").textContent =
      translation.instructions;
    document.getElementById("themeTitle").textContent = translation.theme;
    document.getElementById("featuredTitle").textContent = translation.featured;
    document.getElementById("featuredContent").textContent =
      translation.featuredContent;
  
    // Update instructions list
    const instructionsList = document.getElementById("instructionsList");
    instructionsList.innerHTML = "";
    translation.instructionsList.forEach((instruction) => {
      const li = document.createElement("li");
      li.textContent = instruction;
      instructionsList.appendChild(li);
    });
  
    // Save language preference
    localStorage.setItem("selectedLanguage", lang);
  }
  
  // File handling
  document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please upload a valid image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be under 5MB.");
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (e) => {
        document.querySelector(".result-image").src = e.target.result;
      };
      reader.readAsDataURL(file);
  
      document.getElementById("actionButtons").style.display = "flex";
      document.getElementById("resultSection").style.display = "none";
    }
  });
  
  // Scan functionality
  document.getElementById("scanButton").addEventListener("click", () => {
    const resultSection = document.getElementById("resultSection");
    const progress = document.getElementById("progress");
    const aiExplanation = document.getElementById("aiExplanation");
  
    resultSection.style.display = "block";
    progress.textContent = "Analyzing...";
    progress.style.width = "0%";
  
    setTimeout(() => {
      let confidence = Math.floor(Math.random() * 101);
      progress.style.width = `${confidence}%`;
      progress.textContent = `${confidence}% ${
        confidence > 50 ? "Authentic" : "Tampered"
      }`;
      progress.classList.toggle("tampered", confidence < 50);
      progress.classList.toggle("authentic", confidence >= 50);
  
      const lang = document.getElementById("languageDropdown").value;
      aiExplanation.textContent =
        confidence < 50
          ? translations[lang].tamperedMessage ||
            "Possible tampering detected. Review metadata and pixel inconsistencies."
          : translations[lang].noTampering;
  
      resultSection.scrollIntoView({ behavior: "smooth" });
    }, 2000);
  });
  
  // Clear functionality
  document.getElementById("clearButton").addEventListener("click", () => {
    document.getElementById("actionButtons").style.display = "none";
    document.getElementById("resultSection").style.display = "none";
    document.getElementById("fileInput").value = "";
  });
  
  // Modal functionality
  function openModal() {
    document.getElementById("settingsModal").style.display = "block";
    adjustModalPosition();
  }
  
  function closeModal() {
    document.getElementById("settingsModal").style.display = "none";
  }
  
  function adjustModalPosition() {
    const modal = document.querySelector(".modal-content");
    if (window.innerHeight < 600) {
      modal.style.marginTop = "5%";
    } else {
      modal.style.marginTop = "15%";
    }
  }
  
  // Theme switching
  function setTheme(theme) {
    document.body.classList.remove("dark-theme", "light-theme", "original-theme");
    document.body.classList.add(`${theme}-theme`);
    localStorage.setItem("selectedTheme", theme);
  }
  
  // Initialize
  document.addEventListener("DOMContentLoaded", function () {
    // Load saved theme
    const savedTheme = localStorage.getItem("selectedTheme") || "original";
    setTheme(savedTheme);
  
    // Load saved language
    const savedLanguage = localStorage.getItem("selectedLanguage") || "en";
    document.getElementById("languageDropdown").value = savedLanguage;
    changeLanguage(savedLanguage);
  
    // Add language change listener
    document
      .getElementById("languageDropdown")
      .addEventListener("change", function () {
        changeLanguage(this.value);
      });
  
    // Create stars and particles
    createStars();
    createParticles();
  });
  
  // Close modal when clicking outside
  window.onclick = function (event) {
    if (event.target.classList.contains("modal")) {
      closeModal();
    }
  };
  
  // Function to create stars
  function createStars() {
    const starsContainer = document.querySelector(".stars");
    for (let i = 0; i < 100; i++) {
      const star = document.createElement("div");
      star.classList.add("star");
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 5}s`;
      starsContainer.appendChild(star);
    }
  }
  
  // Function to create particles
  function createParticles() {
    const particlesContainer = document.querySelector(".particles");
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      particle.classList.add("particle");
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.width = `${Math.random() * 10 + 5}px`;
      particle.style.height = particle.style.width;
      particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particlesContainer.appendChild(particle);
    }
  }
  
  // Add event listener for window resize
  window.addEventListener("resize", adjustModalPosition);